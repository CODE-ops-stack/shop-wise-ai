<script lang="ts">
  import PreferencePanel from '../preferences/PreferencePanel.svelte';
  import ProductResultsBlock from '../products/ProductResultsBlock.svelte';
  import AppFooter from '../ui/AppFooter.svelte';
  import StoreMarquee from '../ui/StoreMarquee.svelte';
  import ProductSearchSkeleton from '../products/ProductSearchSkeleton.svelte';
  import { EXAMPLE_PROMPTS, TRUST_FEATURES } from '../../../../config/site';
  import { getRecentSearches, saveRecentSearch } from '../../../lib/ui/recent-searches';
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
  let messagesContainer = $state<HTMLDivElement | null>(null);
  let textareaEl = $state<HTMLTextAreaElement | null>(null);
  let recentSearches = $state<string[]>([]);

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

  async function submitQuery(query: string) {
    const trimmed = query.trim();
    if (!trimmed || isAnalyzing || hasPendingPanel || isSearching) return;

    const userMessage: ChatMessage = {
      id: createMessageId(),
      role: 'user',
      type: 'text',
      content: trimmed,
      timestamp: Date.now(),
    };

    messages = [...messages, userMessage];
    saveRecentSearch(trimmed);
    recentSearches = getRecentSearches();
    isAnalyzing = true;

    try {
      const localAnalysis = analyzeQuery(trimmed);
      applyAnalysis(trimmed, localAnalysis);
      void fetchEnhancedAnalysis(trimmed, localAnalysis);
    } finally {
      isAnalyzing = false;
    }
  }

  async function handleSubmit() {
    const query = input.trim();
    if (!query || isAnalyzing || hasPendingPanel || isSearching) return;
    input = '';
    await submitQuery(query);
  }

  function useExamplePrompt(prompt: string) {
    if (isAnalyzing || hasPendingPanel || isSearching) return;
    void submitQuery(prompt);
  }

  function startNewChat() {
    messages = [];
    input = '';
    isAnalyzing = false;
    isEnhancing = false;
    isSearching = false;
    refiningMessageId = null;
  }

  $effect(() => {
    recentSearches = getRecentSearches();
  });

  function prefersInstantScroll(): boolean {
    if (typeof window === 'undefined') return true;
    return window.matchMedia(
      '(max-width: 767px), (hover: none), (prefers-reduced-motion: reduce)',
    ).matches;
  }

  function isNearBottom(el: HTMLElement, threshold = 140): boolean {
    return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  }

  $effect(() => {
    void messages.length;
    void isAnalyzing;
    void isEnhancing;
    void isSearching;
    const el = messagesContainer;
    if (!el) return;
    requestAnimationFrame(() => {
      const instant = prefersInstantScroll();
      if (!instant && !isNearBottom(el)) return;
      el.scrollTo({ top: el.scrollHeight, behavior: instant ? 'auto' : 'smooth' });
    });
  });

  $effect(() => {
    void input;
    const el = textareaEl;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  });

  function isTypingTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
  }

  function onGlobalKeydown(event: KeyboardEvent) {
    if (event.key === '/' && !isTypingTarget(event.target)) {
      event.preventDefault();
      textareaEl?.focus();
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

<svelte:window onkeydown={onGlobalKeydown} />

<div class="relative z-10 mx-auto flex min-h-screen max-w-3xl flex-col px-4 pb-6 pt-5 sm:px-6">
  <!-- Header -->
  <header class="glass-luxe neon-border scan-line mb-5 rounded-2xl px-5 py-4 animate-fashion-pop">
    <div class="flex items-center gap-3">
      <div
        class="logo-burst flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pink via-magenta to-violet pink-glow animate-glow-pulse animate-float"
      >
        <svg class="h-5 w-5 text-white drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      </div>
      <div class="min-w-0 flex-1">
        <p class="font-display text-[11px] font-bold uppercase tracking-[0.25em] text-gradient-neon">ShopWise AI</p>
        <h1 class="truncate font-display text-lg font-bold tracking-tight text-text sm:text-xl">
          Find the right product, <span class="text-gradient-neon">fast</span>
        </h1>
      </div>
      {#if messages.length > 0}
        <button
          type="button"
          class="shrink-0 rounded-xl border border-white/10 bg-surface/80 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted transition hover:border-pink/40 hover:text-pink"
          onclick={startNewChat}
        >
          New chat
        </button>
      {/if}
    </div>
    <div class="mt-3">
      <StoreMarquee />
    </div>
  </header>

  <!-- Messages -->
  <div
    bind:this={messagesContainer}
    class="messages-scroll flex-1 space-y-4 overflow-y-auto overscroll-y-contain pb-4 scroll-smooth"
  >
    {#if messages.length === 0}
      <div
        class="fashion-hero-burst glass-panel neon-border card-hover-lift rounded-2xl border-dashed border-pink/25 p-6 sm:p-8 text-center animate-fashion-pop"
      >
        <div class="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-pink/20 to-violet/20 ring-1 ring-pink/30 neon-glow animate-bounce-in animate-glow-pulse">
          <svg class="h-7 w-7 text-pink" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <p class="font-display text-xl font-bold text-gradient-neon sm:text-2xl">What are you shopping for?</p>
        <p class="mt-2 text-sm text-text-muted">Tap a suggestion or type your own query</p>
        <div class="mt-4 flex flex-wrap justify-center gap-2">
          <span class="hero-stat-pill rounded-full bg-pink/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-pink ring-1 ring-pink/30">AI picks</span>
          <span class="hero-stat-pill rounded-full bg-violet/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-violet ring-1 ring-violet/30">Exact links</span>
          <span class="hero-stat-pill rounded-full bg-cyan/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan ring-1 ring-cyan/30">5 stores</span>
        </div>
        <div class="holographic-line mx-auto mt-5 max-w-xs"></div>

        <div class="bento-grid mt-5">
          {#each EXAMPLE_PROMPTS as prompt, i}
            <button
              type="button"
              class="bento-cell fashion-chip holo-card glass-luxe border border-white/10 font-medium text-text-muted transition hover:border-pink/40 hover:text-text animate-slide-up {i === 0
                ? 'bento-wide'
                : ''}"
              style="animation-delay: {120 + i * 70}ms"
              onclick={() => useExamplePrompt(prompt)}
            >
              {prompt}
            </button>
          {/each}
        </div>

        {#if recentSearches.length > 0}
          <div class="mt-5 text-left">
            <p class="text-[10px] font-semibold uppercase tracking-widest text-text-subtle">Recent</p>
            <div class="mt-2 flex flex-wrap gap-2">
              {#each recentSearches as query}
                <button
                  type="button"
                  class="rounded-full border border-violet/20 bg-violet/10 px-3 py-1.5 text-xs font-medium text-text-muted transition hover:border-violet/40 hover:text-text"
                  onclick={() => useExamplePrompt(query)}
                >
                  {query}
                </button>
              {/each}
            </div>
          </div>
        {/if}

        <div class="mt-6 flex flex-wrap items-center justify-center gap-3">
          {#each TRUST_FEATURES as feature}
            <span
              class="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-subtle ring-1 ring-white/8"
            >
              {#if feature.icon === 'link'}
                <svg class="h-3 w-3 text-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              {:else if feature.icon === 'spark'}
                <svg class="h-3 w-3 text-pink" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              {:else}
                <svg class="h-3 w-3 text-violet" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              {/if}
              {feature.label}
            </span>
          {/each}
        </div>
      </div>
    {/if}

    {#each messages as message (message.id)}
      {#if message.type === 'text'}
        <div
          class="flex animate-fashion-pop {message.role === 'user' ? 'justify-end' : 'justify-start'}"
        >
          <div
            class="max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed
              {message.role === 'user'
              ? 'user-bubble-luxe text-white shadow-lg shadow-pink/30 neon-glow'
              : 'glass-luxe border-cyan/15 text-text-muted'}"
          >
            {message.content}
          </div>
        </div>
      {:else if message.type === 'preference_panel'}
        <div class="flex animate-slide-up justify-start">
          <div class="w-full max-w-lg">
            {#if message.status === 'submitted' && message.submittedPreferences}
              <div class="glass-panel neon-border rounded-2xl px-4 py-3">
                <p class="text-[10px] font-semibold uppercase tracking-widest text-gradient-neon">Preferences saved</p>
                <div class="mt-2.5 flex flex-wrap gap-2">
                  {#each panelSummary(message.submittedPreferences) as chip}
                    <span
                      class="chip-neon-active rounded-full border px-3 py-1 text-xs font-medium"
                    >
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
        <div class="cinema-reveal flex justify-start">
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
      <div class="flex justify-start animate-fade-in">
        <div class="glass-panel flex items-center gap-3 rounded-2xl px-4 py-3 border-cyan/15">
          <span class="relative flex h-2.5 w-2.5">
            <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-pink opacity-60"></span>
            <span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-pink"></span>
          </span>
          <span class="text-sm text-text-muted">Understanding your request…</span>
        </div>
      </div>
    {/if}

    {#if isEnhancing}
      <div class="flex justify-start animate-fade-in">
        <div class="glass-panel flex items-center gap-3 rounded-2xl px-4 py-3 border-violet/15">
          <span class="h-2 w-2 animate-shimmer rounded-full bg-pink-glow"></span>
          <span class="text-sm text-text-muted">Refining with AI…</span>
        </div>
      </div>
    {/if}

    {#if isSearching}
      <div class="w-full animate-fade-in space-y-3">
        <div class="glass-panel flex items-center gap-3 rounded-2xl px-4 py-3 border-pink/15">
          <span class="h-2 w-2 animate-pulse rounded-full bg-cyan"></span>
          <span class="text-sm text-text-muted">Finding products with AI…</span>
        </div>
        <ProductSearchSkeleton />
      </div>
    {/if}
  </div>

  <!-- Input -->
  <div class="input-luxe glass-luxe neon-border sticky bottom-4 rounded-2xl p-3 sm:bottom-6" style="padding-bottom: max(0.75rem, env(safe-area-inset-bottom));">
    <div class="flex items-end gap-2">
      <textarea
        bind:this={textareaEl}
        class="min-h-[48px] max-h-32 flex-1 resize-none rounded-xl border border-white/8 bg-surface/80 px-4 py-3 text-sm text-text outline-none transition placeholder:text-text-subtle focus:border-pink/50 focus:ring-2 focus:ring-pink/25 disabled:opacity-50"
        rows="1"
        placeholder="What are you shopping for?"
        bind:value={input}
        disabled={isAnalyzing || hasPendingPanel || isSearching}
        onkeydown={onKeydown}
        aria-label="Shopping query"
      ></textarea>
      <button
        type="button"
        class="btn-neon rounded-xl px-5 py-3 text-sm font-bold uppercase tracking-wide text-white disabled:cursor-not-allowed disabled:opacity-40"
        disabled={!input.trim() || isAnalyzing || hasPendingPanel || isSearching}
        onclick={handleSubmit}
        aria-label="Send message"
      >
        Send
      </button>
    </div>
    <p class="mt-2 text-center text-[10px] text-text-subtle">
      <kbd class="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[9px]">/</kbd> focus
      <span class="mx-1 text-white/20">·</span>
      <kbd class="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[9px]">Enter</kbd> send
      <span class="mx-1 text-white/20">·</span>
      <kbd class="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[9px]">Shift+Enter</kbd> new line
    </p>
  </div>

  <AppFooter />
</div>