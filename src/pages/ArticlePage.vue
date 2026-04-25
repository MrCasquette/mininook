<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { useArticleLoader } from '@/composables/useArticleLoader';
import { useArticleActions } from '@/composables/useArticleActions';
import { useArticleKeyboard } from '@/composables/useArticleKeyboard';
import { useArticleContent } from '@/composables/useArticleContent';
import { useImageSrc } from '@/composables/useImageSrc';
import { needsProxy, proxyImage } from '@/services/imageProxy';
import {
  calculateReadingTimeFromWords,
  calculateReadingTimeFromHtml,
} from '@/utils/readingTime';
import UserIcon from '@/components/atoms/icons/UserIcon.vue';
import CalendarIcon from '@/components/atoms/icons/CalendarIcon.vue';
import ClockIcon from '@/components/atoms/icons/ClockIcon.vue';

const props = defineProps<{
  id: string;
}>();

const { t, locale } = useI18n();
const entryId = () => Number(props.id);

const { entry, parsed, paywall, loading, error } = useArticleLoader(entryId);
const { isRead, goBack, markRead, toggleBookmark, openOriginal, handleContentClick } =
  useArticleActions(entry);
const { rawHeroImage, articleContent } = useArticleContent({ entry, parsed, paywall, entryId });

useArticleKeyboard({ onMarkRead: markRead, onToggleBookmark: toggleBookmark });

const articleUrl = computed(() => entry.value?.url);
const { src: heroImage } = useImageSrc(rawHeroImage, articleUrl);

const publishedDate = computed(() => {
  if (!entry.value) return '';
  return new Date(entry.value.published_at).toLocaleDateString(locale.value, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
});

const readingTime = computed(() => {
  let minutes = 0;
  if (parsed.value?.wordCount) {
    minutes = calculateReadingTimeFromWords(parsed.value.wordCount);
  } else if (articleContent.value) {
    minutes = calculateReadingTimeFromHtml(articleContent.value);
  } else if (entry.value?.reading_time && entry.value.reading_time > 0) {
    minutes = entry.value.reading_time;
  }
  if (minutes <= 0) return null;
  return t('article.readingTime', { n: minutes });
});

const contentRef = ref<HTMLDivElement | null>(null);

// After the article content renders, walk every <img>:
//   - if it points to a hot-link-protected host, swap the src for a proxied blob URL
//   - on load error, hide the surrounding figure/picture wrapper
watch([articleContent, contentRef], async () => {
  await nextTick();
  const container = contentRef.value;
  if (!container) return;
  const imgs = Array.from(container.querySelectorAll('img'));
  const ref = entry.value?.url;

  for (const img of imgs) {
    img.addEventListener('error', () => {
      const wrapper = img.closest('figure, picture');
      (wrapper ?? img).remove();
    }, { once: true });

    const src = img.getAttribute('src');
    if (src && needsProxy(src)) {
      proxyImage(src, ref).then((proxied) => {
        if (!proxied) return;
        img.setAttribute('src', proxied);
        img.removeAttribute('srcset');
      });
    }
  }
});
</script>

<template>
  <div class="min-h-screen bg-zinc-950">
    <!-- Top bar -->
    <header class="sticky top-0 z-40 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl">
      <div class="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
        <button
          class="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
          @click="goBack"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>

        <div class="flex items-center gap-1">
          <button
            :class="[
              'rounded-lg p-1.5 transition-colors hover:bg-zinc-800',
              isRead ? 'text-green-400' : 'text-zinc-400 hover:text-zinc-200',
            ]"
            :title="isRead ? t('article.alreadyRead') : t('article.markRead')"
            :disabled="isRead"
            @click="markRead"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </button>
          <button
            :class="[
              'rounded-lg p-1.5 transition-colors hover:bg-zinc-800',
              entry?.starred ? 'text-amber-400' : 'text-zinc-400 hover:text-zinc-200',
            ]"
            :title="t('article.bookmark')"
            @click="toggleBookmark"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" :fill="entry?.starred ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
            </svg>
          </button>
          <button
            class="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
            :title="t('article.openOriginal')"
            @click="openOriginal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            </svg>
          </button>
        </div>
      </div>
    </header>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center pt-32">
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="flex items-center justify-center pt-32">
      <div class="rounded-2xl border border-red-900/50 bg-red-950/50 px-6 py-4 text-center">
        <p class="text-sm text-red-400">{{ error }}</p>
      </div>
    </div>

    <!-- Article -->
    <article v-else-if="entry" class="pb-24">
      <!-- Hero image + caption -->
      <div v-if="heroImage" class="mx-auto max-w-3xl">
        <img
          :src="heroImage"
          :alt="entry.title"
          class="h-56 w-full rounded-b-xl object-cover sm:h-72 lg:h-96"
          @error="($event.target as HTMLImageElement).parentElement!.style.display = 'none'"
        />
        <p
          v-if="parsed?.heroCaption"
          class="px-4 pt-2 text-xs italic leading-snug text-zinc-500 sm:px-6"
        >
          {{ parsed.heroCaption }}
        </p>
      </div>

      <div class="mx-auto max-w-3xl px-4 pt-8 sm:px-6">
        <!-- Header: title, then site·author, then date·time (with icons) -->
        <div class="mb-6 flex flex-col gap-3">
          <h1 class="text-2xl font-bold leading-tight text-zinc-100 sm:text-3xl lg:text-4xl">
            {{ entry.title }}
          </h1>

          <div class="flex items-center justify-between gap-3 text-sm text-zinc-500">
            <span class="font-medium text-zinc-400">{{ parsed?.siteName ?? entry.feed.title }}</span>
            <span v-if="entry.author" class="flex items-center gap-1.5">
              <UserIcon class="h-4 w-4" />
              {{ entry.author }}
            </span>
          </div>

          <div class="flex items-center justify-between gap-3 text-sm text-zinc-500">
            <time class="flex items-center gap-1.5">
              <CalendarIcon class="h-4 w-4" />
              {{ publishedDate }}
            </time>
            <span v-if="readingTime" class="flex items-center gap-1.5">
              <ClockIcon class="h-4 w-4" />
              {{ readingTime }}
            </span>
          </div>
        </div>

        <!-- Paywall notice -->
        <div
          v-if="paywall.isPaywalled"
          class="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="mt-0.5 h-5 w-5 shrink-0 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <div class="text-sm">
            <p class="font-medium text-amber-400">{{ t('article.paywallTitle') }}</p>
            <p class="mt-0.5 text-zinc-500">
              {{
                paywall.truncatedPercent
                  ? t('article.paywallPartialPercent', { percent: 100 - paywall.truncatedPercent })
                  : t('article.paywallPartial')
              }}
              <button class="text-zinc-400 underline underline-offset-2 hover:text-zinc-200" @click="openOriginal">
                {{ t('article.paywallReadOnSite') }}
              </button>
            </p>
          </div>
        </div>

        <!-- Content -->
        <div
          ref="contentRef"
          class="article-content"
          v-html="articleContent"
          @click="handleContentClick"
        />
      </div>
    </article>
  </div>
</template>

<style>
.article-content {
  font-size: 1rem;
  line-height: 1.75;
  color: #d4d4d8;
}

.article-content h1,
.article-content h2,
.article-content h3,
.article-content h4,
.article-content h5,
.article-content h6 {
  margin-top: 2rem;
  margin-bottom: 1rem;
  font-weight: 700;
  color: #f4f4f5;
}

.article-content h2 { font-size: 1.25rem; }
.article-content h3 { font-size: 1.125rem; }
.article-content p { margin-bottom: 1rem; }

.article-content a {
  color: #60a5fa;
  text-decoration: underline;
  text-decoration-color: rgb(96 165 250 / 0.3);
  text-underline-offset: 2px;
  transition: color 0.15s, text-decoration-color 0.15s;
}

.article-content a:hover {
  color: #93bbfd;
  text-decoration-color: rgb(147 187 253 / 0.5);
}

.article-content img {
  margin: 1.5rem 0;
  width: 100%;
  border-radius: 0.75rem;
}

.article-content figure { margin: 1.5rem 0; }
.article-content figure img { margin: 0; }

.article-content figcaption,
.article-content img + span {
  margin-top: 0.5rem;
  text-align: center;
  font-size: 0.8125rem;
  font-style: italic;
  color: #71717a;
  display: block;
}

.article-content blockquote {
  margin: 1rem 0;
  border-left: 2px solid #3f3f46;
  padding-left: 1rem;
  font-style: italic;
  color: #a1a1aa;
}

.article-content ul,
.article-content ol { margin: 1rem 0; padding-left: 1.5rem; }
.article-content ul { list-style-type: disc; }
.article-content ol { list-style-type: decimal; }
.article-content li { margin-bottom: 0.5rem; }

.article-content pre {
  margin: 1rem 0;
  overflow-x: auto;
  border-radius: 0.75rem;
  background: #18181b;
  padding: 1rem;
  font-size: 0.875rem;
}

.article-content code {
  border-radius: 0.25rem;
  background: #27272a;
  padding: 0.125rem 0.375rem;
  font-size: 0.875rem;
  color: #d4d4d8;
}

.article-content pre code { background: transparent; padding: 0; }

.article-content table {
  margin: 1rem 0;
  width: 100%;
  border-collapse: collapse;
}

.article-content th,
.article-content td {
  border: 1px solid #27272a;
  padding: 0.5rem 0.75rem;
  text-align: left;
  font-size: 0.875rem;
}

.article-content th { background: #18181b; font-weight: 600; color: #d4d4d8; }
.article-content hr { margin: 2rem 0; border-color: #27272a; }

.article-content iframe {
  margin: 1.5rem 0;
  aspect-ratio: 16 / 9;
  width: 100%;
  border-radius: 0.75rem;
}

@media (min-width: 640px) {
  .article-content h2 { font-size: 1.5rem; }
  .article-content h3 { font-size: 1.25rem; }
}
</style>
