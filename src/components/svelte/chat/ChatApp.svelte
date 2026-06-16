<script lang="ts">
  import PreferencePanel from '../preferences/PreferencePanel.svelte';
  import ProductResultsBlock from '../products/ProductResultsBlock.svelte';
  import { analyzeQuery, panelSummary, resolvePreferences } from '../../../lib/preferences/analyzer';
  import type { AnalyzeResponse, SearchErrorResponse, SearchResponse } from '../../../types/api';
  import type { ChatMessage } from '../../../types/chat';
  import { createMessageId } from '../../../types/chat';
  import { mergeQuickFiltersIntoPreferences } from '../../../lib/products/visible-filters';
  import type { QuickFilterId } from '../../../lib/products/visible-filters';
  import type { FilledSlots, QueryAnalysis, ResolvedPreferences } from '../../../types/preferences';

  let messages = $state<ChatMessage[]>([]);
  let input = $state('');
  let isAnalyzing = $state(false);
  let isEnhancing = $state(false);
  let isSearching = $state(false);
  let refiningMessageId = $state<string | null>(null);

  const hasPendingPanel = $derived(
    messages.some((m) => m.type === 'preference_panel' && m.status === 'pending'),
  );

  function buildAssistantIntro(analysis: QueryAnalysis): string {
    if (analysis.panel) {
      return `Got it — let's narrow down your ${analysis.subcategory ?? 'clothing'} search. Pick only what's missing:`;
    }
    return `Got it — searching for: ${analysis.searchIntent}`;
  }

  function applyAnalysis(query: string, analysis: QueryAnalysis, enhanced = false) {
    const intro: ChatMessage = {
      id: createMessageId(),
      role: 'assistant',
      type: 'text',
      content: buildAssistantIntro(analysis),
      timestamp: Date.now(),
    };

    if (analysis.panel) {
      messages = [
        ...messages.filter(
          (m) =>
            !(
              m.type === 'preference_panel' &&
              m.status === 'pending' &&
              m.timestamp > Date.now() - 60_000
            ),
        ),
        intro,
        {
          id: createMessageId(),
          role: 'assistant',
          type: 'preference_panel',
          panel: enhanced && analysis.panel.subtitle
            ? { ...analysis.panel, subtitle: `${analysis.panel.subtitle} (AI-refined)` }
            : analysis.panel,
          status: 'pending',
          timestamp: Date.now(),
        },
      ];
      return;
    }

    messages = [...messages, intro];
    void showProductResults({
      categoryId: analysis.categoryId,
      subcategory: analysis.subcategory,
      searchIntent: analysis.searchIntent,
      slots: analysis.filledSlots,
    });
  }

  async function fetchEnhancedAnalysis(query: string, localAnalysis: QueryAnalysis) {
    isEnhancing = true;
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) return;

      const data = (await response.json()) as AnalyzeResponse;
      if (!data.geminiUsed) return;

      const panelMessageIndex = messages.findIndex(
        (m) => m.type === 'preference_panel' && m.status === 'pending',
      );

      if (panelMessageIndex === -1) {
        if (!localAnalysis.panel && data.analysis.panel) {
          applyAnalysis(query, data.analysis, true);
        }
        return;
      }

      if (data.analysis.panel) {
        const existing = messages[panelMessageIndex];
        if (existing.type === 'preference_panel') {
          messages = messages.map((m, i) =>
            i === panelMessageIndex
              ? { ...existing, panel: data.analysis.panel! }
              : m,
          );
        }
      } else if (!data.analysis.panel && localAnalysis.panel) {
        messages = messages.filter((_, i) => i !== panelMessageIndex);
        await showProductResults({
          categoryId: data.analysis.categoryId,
          subcategory: data.analysis.subcategory,
          searchIntent: data.analysis.searchIntent,
          slots: data.analysis.filledSlots,
        });
      }
    } catch {
      // Local analysis already shown — silent fallback.
    } finally {
      isEnhancing = false;
    }
  }

  async function showProductResults(
    preferences: ResolvedPreferences,
    options?: { replaceMessageId?: string },
  ) {
    const isReplace = Boolean(options?.replaceMessageId);
    if (isReplace) {
      refiningMessageId = options?.replaceMessageId ?? null;
    } else {
      isSearching = true;
    }

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences }),
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => ({}))) as SearchErrorResponse;
        if (!isReplace) {
          messages = [
            ...messages,
            {
              id: createMessageId(),
              role: 'assistant',
              type: 'text',
              content:
                errorBody.error ??
                'Could not fetch product recommendations right now. Please try again.',
              timestamp: Date.now(),
            },
          ];
        }
        return;
      }

      const data = (await response.json()) as SearchResponse;

      if (isReplace && options?.replaceMessageId) {
        messages = messages.map((message) =>
          message.id === options.replaceMessageId && message.type === 'product_results'
            ? {
                ...message,
                results: data.results,
                preferences,
                timestamp: Date.now(),
              }
            : message,
        );
      } else {
        messages = [
          ...messages,
          {
            id: createMessageId(),
            role: 'assistant',
            type: 'product_results',
            results: data.results,
            preferences,
            timestamp: Date.now(),
          },
        ];
      }
    } catch {
      if (!isReplace) {
        messages = [
          ...messages,
          {
            id: createMessageId(),
            role: 'assistant',
            type: 'text',
            content: 'Product search failed. Check your connection and try again.',
            timestamp: Date.now(),
          },
        ];
      }
    } finally {
      isSearching = false;
      refiningMessageId = null;
    }
  }

  function handleQuickFilterRefine(
    messageId: string,
    basePreferences: ResolvedPreferences,
    selections: Partial<Record<QuickFilterId, string>>,
  ) {
    const merged = mergeQuickFiltersIntoPreferences(basePreferences, selections);
    void showProductResults(merged, { replaceMessageId: messageId });
  }

  async function handleSubmit() {
    const query = input.trim();
    if (!query || isAnalyzing || hasPendingPanel) return;

    const userMessage: ChatMessage = {
      id: createMessageId(),
      role: 'user',
      type: 'text',
      content: query,
      timestamp: Date.now(),
    };

    messages = [...messages, userMessage];
    input = '';
    isAnalyzing = true;

    try {
      const localAnalysis = analyzeQuery(query);
      applyAnalysis(query, localAnalysis);
      void fetchEnhancedAnalysis(query, localAnalysis);
    } finally {
      isAnalyzing = false;
    }
  }

  function handlePreferenceSubmit(messageId: string, selections: FilledSlots) {
    const panelMessage = messages.find(
      (m) => m.id === messageId && m.type === 'preference_panel',
    );
    if (!panelMessage || panelMessage.type !== 'preference_panel') return;

    const resolved = resolvePreferences(panelMessage.panel, selections);

    messages = messages.map((message) => {
      if (message.id !== messageId || message.type !== 'preference_panel') return message;
      return {
        ...message,
        status: 'submitted' as const,
        submittedPreferences: resolved,
      };
    });

    const chips = panelSummary(resolved);
    messages = [
      ...messages,
      {
        id: createMessageId(),
        role: 'assistant',
        type: 'text',
        content:
          chips.length > 0
            ? `Perfect — searching with ${chips.join(' · ')}.`
            : 'Searching now.',
        timestamp: Date.now(),
      },
    ];

    void showProductResults(resolved);
  }

  function handlePreferenceSkip(messageId: string) {
    const panelMessage = messages.find(
      (m) => m.id === messageId && m.type === 'preference_panel',
    );
    if (!panelMessage || panelMessage.type !== 'preference_panel') return;

    const resolved = resolvePreferences(panelMessage.panel, {});

    messages = messages.map((message) => {
      if (message.id !== messageId || message.type !== 'preference_panel') return message;
      return {
        ...message,
        status: 'submitted' as const,
        submittedPreferences: resolved,
      };
    });

    messages = [
      ...messages,
      {
        id: createMessageId(),
        role: 'assistant',
        type: 'text',
        content: 'Showing results with what we already know.',
        timestamp: Date.now(),
      },
    ];

    void showProductResults(resolved);
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  }
</script>

<div class="mx-auto flex h-[calc(100vh-4rem)] max-w-2xl flex-col px-4 py-6">
  <header class="mb-6">
    <p class="text-xs font-semibold uppercase tracking-widest text-indigo-600">ShopWise AI</p>
    <h1 class="mt-1 text-2xl font-bold text-slate-900">Find the right product, fast</h1>
    <p class="mt-1 text-sm text-slate-500">
      Clothing-first assistant for Myntra, Ajio, Nykaa Fashion, Amazon, Flipkart & more.
    </p>
  </header>

  <div class="flex-1 space-y-4 overflow-y-auto pb-4">
    {#if messages.length === 0}
      <div class="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-center">
        <p class="text-sm text-slate-600">
          Try: <span class="font-medium text-slate-800">"Black cotton kurta for men under ₹1500"</span>
        </p>
      </div>
    {/if}

    {#each messages as message (message.id)}
      {#if message.type === 'text'}
        <div class="flex {message.role === 'user' ? 'justify-end' : 'justify-start'}">
          <div
            class="max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed
              {message.role === 'user'
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-slate-700 shadow-sm ring-1 ring-slate-200/80'}"
          >
            {message.content}
          </div>
        </div>
      {:else if message.type === 'preference_panel'}
        <div class="flex justify-start">
          <div class="w-full max-w-md">
            {#if message.status === 'submitted' && message.submittedPreferences}
              <div class="rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3">
                <p class="text-xs font-medium uppercase tracking-wide text-slate-500">Preferences</p>
                <div class="mt-2 flex flex-wrap gap-2">
                  {#each panelSummary(message.submittedPreferences) as chip}
                    <span class="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                      {chip}
                    </span>
                  {/each}
                </div>
              </div>
            {:else}
              <PreferencePanel
                panel={message.panel}
                disabled={message.status === 'submitted'}
                onsubmit={(selections) => handlePreferenceSubmit(message.id, selections)}
                onskip={() => handlePreferenceSkip(message.id)}
              />
            {/if}
          </div>
        </div>
      {:else if message.type === 'product_results'}
        <div class="flex justify-start">
          <div class="w-full">
            <ProductResultsBlock
              results={message.results}
              preferences={message.preferences}
              isRefining={refiningMessageId === message.id}
              onrefine={(selections) =>
                handleQuickFilterRefine(message.id, message.preferences, selections)}
            />
          </div>
        </div>
      {/if}
    {/each}

    {#if isAnalyzing}
      <div class="flex justify-start">
        <div class="rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200/80">
          <div class="flex items-center gap-2">
            <span class="h-2 w-2 animate-pulse rounded-full bg-indigo-500"></span>
            <span class="text-sm text-slate-500">Understanding your request…</span>
          </div>
        </div>
      </div>
    {/if}

    {#if isEnhancing}
      <div class="flex justify-start">
        <div class="rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200/80">
          <div class="flex items-center gap-2">
            <span class="h-2 w-2 animate-pulse rounded-full bg-violet-400"></span>
            <span class="text-sm text-slate-500">Refining with AI…</span>
          </div>
        </div>
      </div>
    {/if}

    {#if isSearching}
      <div class="flex justify-start">
        <div class="rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200/80">
          <div class="flex items-center gap-2">
            <span class="h-2 w-2 animate-pulse rounded-full bg-emerald-500"></span>
            <span class="text-sm text-slate-500">Finding products with AI…</span>
          </div>
        </div>
      </div>
    {/if}
  </div>

  <div class="sticky bottom-0 border-t border-slate-200/80 bg-white/90 pt-4 backdrop-blur">
    <div class="flex items-end gap-2">
      <textarea
        class="min-h-[48px] flex-1 resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
        rows="1"
        placeholder="What are you shopping for?"
        bind:value={input}
        disabled={isAnalyzing || hasPendingPanel || isSearching}
        onkeydown={onKeydown}
      ></textarea>
      <button
        type="button"
        class="rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!input.trim() || isAnalyzing || hasPendingPanel || isSearching}
        onclick={handleSubmit}
      >
        Send
      </button>
    </div>
  </div>
</div>