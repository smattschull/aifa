// @/app/@right/(_PRIVAT_ROUTES)/admin/(_routing)/pages/[slug]/(_service)/(_config)/step-completion-config.ts

import type { PageData } from "@/app/@right/(_service)/(_types)/page-types";
import type { AdminPageTab } from "../(_context)/admin-pages-nav-context";

/**
 * Interface for step completion validation logic
 */
export interface StepCompletionCondition {
  stepKey: AdminPageTab;
  validate: (pageData: PageData | null) => boolean;
  description: string;
  debugInfo?: (pageData: PageData | null) => string;
}

/**
 * ✅ КОНФИГУРАЦИЯ: Условия завершения для каждого шага
 */
export const STEP_COMPLETION_CONDITIONS: StepCompletionCondition[] = [
  {
    stepKey: "step1",
    validate: (pageData: PageData | null) => {
      // Step 1: Competitor Analysis - завершен если есть хотя бы один анализ конкурентов
      return (pageData?.competitorAnalysis?.length ?? 0) > 0;
    },
    description: "Требует хотя бы один анализ конкурентов",
    debugInfo: (pageData) =>
      `🎯 Найдено конкурентов: ${pageData?.competitorAnalysis?.length ?? 0}`,
  },

  {
    stepKey: "step2",
    validate: (pageData: PageData | null) => {
      // Step 2: Load Analysis Results - завершен если хотя бы один конкурент проанализирован
      return (
        pageData?.competitorAnalysis?.some(
          (analysis) => analysis.isAnalyzed === true,
        ) ?? false
      );
    },
    description: "Требует хотя бы одного проанализированного конкурента",
    debugInfo: (pageData) => {
      const analyzedCount =
        pageData?.competitorAnalysis?.filter((a) => a.isAnalyzed).length ?? 0;
      const totalCount = pageData?.competitorAnalysis?.length ?? 0;
      return `🔍 Проанализировано: ${analyzedCount}/${totalCount}`;
    },
  },

  {
    stepKey: "step5",
    validate: (pageData: PageData | null) => {
      // Step 5: Generator perplexity prompt
      return (
        (pageData?.isReadyPromptForPerplexity !== undefined &&
          pageData?.isReadyPromptForPerplexity !== false) ||
        (pageData?.draftContentStructure?.length ?? 0) > 0
      );
    },
    description: "Требует генерации Perplexity prompt",
    debugInfo: (pageData) =>
      `📝 Perplexity prompt: ${pageData?.isReadyPromptForPerplexity ? "Есть" : "Нет"}`,
  },

  {
    stepKey: "step6",
    validate: (pageData: PageData | null) => {
      // Step 6:
      return (pageData?.draftContentStructure?.length ?? 0) > 0;
    },
    description: "Требует draftContentStructure lenght > 0",
    debugInfo: (pageData) =>
      `📋 Черновик: ${pageData?.draftContentStructure?.length ?? 0}`,
  },
  {
    stepKey: "step7",
    validate: (pageData: PageData | null) => {
      // Step 7
      return (
        pageData?.isReadyDraftForPerplexity !== undefined &&
        pageData?.isReadyDraftForPerplexity !== false
      );
    },
    description: "Требует finish draft structer items chek",
    debugInfo: (pageData) =>
      `📝 isReadyDraftForPerplexity: ${pageData?.isReadyDraftForPerplexity ? "Есть" : "Нет"}`,
  },
  // sections
  {
    stepKey: "step8",
    validate: (pageData: PageData | null) => {
      // Step 6:
      return (pageData?.sections?.length ?? 0) > 0;
    },
    description: "Требует sections lenght > 0",
    debugInfo: (pageData) => `📋 Черновик: ${pageData?.sections?.length ?? 0}`,
  },

  {
    stepKey: "preview",
    validate: (pageData: PageData | null) => {
      // Step 12: Generator isPreviewComplited
      return (
        pageData?.isPreviewComplited !== undefined &&
        pageData?.isPreviewComplited !== false
      );
    },
    description: "Требует генерации isPreviewComplited ",
    debugInfo: (pageData) =>
      `📝 Perplexity prompt: ${pageData?.isPreviewComplited ? "Есть" : "Нет"}`,
  },
];

/**
 * ✅ ФУНКЦИЯ: Получить все завершенные шаги на основе реальных данных
 */
export const getAllCompletedSteps = (
  pageData: PageData | null,
): AdminPageTab[] => {
  if (!pageData) {
    console.log("🎭 No page data - no completed steps");
    return [];
  }

  const completedSteps = STEP_COMPLETION_CONDITIONS.filter((condition) => {
    try {
      return condition.validate(pageData);
    } catch (error) {
      console.error(`Error validating step ${condition.stepKey}:`, error);
      return false;
    }
  }).map((condition) => condition.stepKey);

  if (process.env.NODE_ENV === "development") {
    console.log("🎭 Completed steps computed:", completedSteps);
  }

  return completedSteps;
};

/**
 * ✅ ФУНКЦИЯ: Получить отладочную информацию для всех шагов
 */
export const getStepsDebugInfo = (
  pageData: PageData | null,
): Record<AdminPageTab, string> => {
  const debugInfo: Partial<Record<AdminPageTab, string>> = {};

  STEP_COMPLETION_CONDITIONS.forEach((condition) => {
    const info = condition.debugInfo?.(pageData) || "No debug info";
    const status = condition.validate(pageData)
      ? "ЗАВЕРШЕН ✅"
      : "НЕ ЗАВЕРШЕН ⏳";
    debugInfo[condition.stepKey] = `${status} - ${info}`;
  });

  return debugInfo as Record<AdminPageTab, string>;
};
