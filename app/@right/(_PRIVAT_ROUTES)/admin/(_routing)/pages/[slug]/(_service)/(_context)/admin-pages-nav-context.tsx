// @/app/@right/(_PRIVAT_ROUTES)/admin/(_routing)/pages/[slug]/(_service)/(_context)/admin-pages-nav-context.ts

"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  useEffect,
  useMemo,
} from "react";
import {
  ADMIN_PAGES_CONFIG,
  ADMIN_PAGES_TABS,
  type IndicatorStatus,
  canActivateStep,
} from "../(_config)/admin-pages-config";

// ✅ ИСПРАВЛЕНО: Импортируем конфиг условий завершения
import {
  getAllCompletedSteps,
  getStepsDebugInfo,
} from "../(_config)/step-completion-config";

// ✅ ИСПРАВЛЕНО: Импортируем хук оркестратора
import { useStepsOrchestrator } from "../(_hooks)/use-steps-orchestrator";
import type { PageData } from "@/app/@right/(_service)/(_types)/page-types";

export type AdminPageTab =
  | "info"
  | "step1"
  | "step2"
  | "step3"
  | "step4"
  | "step5"
  | "step6"
  | "step7"
  | "step8"
  | "step9"
  | "step10"
  | "step11"
  | "preview"
  | "deploy";

export type DisplayMode = "all" | "required";

type IndicatorStatuses = {
  [K in AdminPageTab]?: IndicatorStatus;
};

interface AdminPagesNavContextType {
  activeTab: AdminPageTab;
  setActiveTab: (tab: AdminPageTab) => void;
  slug: string;
  indicatorStatuses: IndicatorStatuses;
  setIndicatorStatus: (tab: AdminPageTab, status: IndicatorStatus) => void;
  getIndicatorStatus: (tab: AdminPageTab) => IndicatorStatus | undefined;
  completedSteps: AdminPageTab[];
  markStepAsCompleted: (step: AdminPageTab) => void;
  canActivateStep: (step: AdminPageTab) => boolean;
  isStepCompleted: (step: AdminPageTab) => boolean;
  displayMode: DisplayMode;
  setDisplayMode: (mode: DisplayMode) => void;

  // ✅ НОВЫЕ ПОЛЯ: Интеграция с Steps Orchestrator
  pageData: PageData | null;
  isPageDataLoading: boolean;
  pageDataError: string | null;
  refreshPageData: () => void;
  debugInfo: Record<AdminPageTab, string>;
}

const AdminPagesNavContext = createContext<
  AdminPagesNavContextType | undefined
>(undefined);

interface AdminPagesNavBarProviderProps {
  children: ReactNode;
  slug: string;
  defaultTab?: AdminPageTab;
}

export function AdminPagesNavBarProvider({
  children,
  slug,
  defaultTab = ADMIN_PAGES_CONFIG.defaultTab,
}: AdminPagesNavBarProviderProps) {
  const [activeTab, setActiveTab] = useState<AdminPageTab>(defaultTab);
  const [displayMode, setDisplayMode] = useState<DisplayMode>("required");

  // ✅ ИСПРАВЛЕНО: Используем Steps Orchestrator для получения реальных данных
  const {
    pageData,
    isLoading: isPageDataLoading,
    error: pageDataError,
    refreshPageData,
    updatePageData,
    updatePageDataField,
    syncPageDataToServer,
    getOrchestratorStatus,
  } = useStepsOrchestrator(slug);

  // ✅ ИСПРАВЛЕНО: Автоматически вычисляем завершенные шаги на основе реальных данных
  const completedSteps = useMemo(() => {
    const computed = getAllCompletedSteps(pageData);

    if (process.env.NODE_ENV === "development") {
      console.log("🎭 Context: Computing completed steps", {
        slug,
        pageDataAvailable: !!pageData,
        computedSteps: computed,
      });
    }

    return computed;
  }, [pageData, slug]);

  // ✅ ИСПРАВЛЕНО: Получаем отладочную информацию
  const debugInfo = useMemo(() => {
    return getStepsDebugInfo(pageData);
  }, [pageData]);

  // ✅ ИСПРАВЛЕНО: Инициализация статусов через useMemo
  const initialStatuses: IndicatorStatuses = useMemo(() => {
    const statuses: IndicatorStatuses = {};
    ADMIN_PAGES_TABS.forEach((tab) => {
      if (tab.hasIndicator && tab.defaultIndicatorStatus) {
        statuses[tab.key] = tab.defaultIndicatorStatus;
      }
    });
    return statuses;
  }, []);

  // ✅ ИСПРАВЛЕНО: Вычисляем статусы на основе завершенных шагов
  const computedIndicatorStatuses = useMemo(() => {
    const newStatuses: IndicatorStatuses = { ...initialStatuses };

    ADMIN_PAGES_TABS.forEach((tab) => {
      if (tab.hasIndicator) {
        if (completedSteps.includes(tab.key)) {
          // Шаг завершен - зеленый
          newStatuses[tab.key] = "green";
        } else if (canActivateStep(tab.key, completedSteps)) {
          // Шаг готов к выполнению - оранжевый
          newStatuses[tab.key] = "orange";
        } else {
          // Шаг недоступен - серый
          newStatuses[tab.key] = "gray";
        }
      }
    });

    return newStatuses;
  }, [completedSteps, initialStatuses]);

  const [indicatorStatuses, setIndicatorStatuses] = useState<IndicatorStatuses>(
    computedIndicatorStatuses
  );

  // ✅ ИСПРАВЛЕНО: Обновляем статусы только при их изменении
  useEffect(() => {
    setIndicatorStatuses(computedIndicatorStatuses);
  }, [computedIndicatorStatuses]);

  const setIndicatorStatus = (tab: AdminPageTab, status: IndicatorStatus) => {
    setIndicatorStatuses((prev) => ({
      ...prev,
      [tab]: status,
    }));
  };

  const getIndicatorStatus = (
    tab: AdminPageTab
  ): IndicatorStatus | undefined => {
    return indicatorStatuses[tab];
  };

  // ✅ ОБНОВЛЕНО: Функция помечания как завершенного теперь устарела
  const markStepAsCompleted = (step: AdminPageTab) => {
    console.warn(`🎭 markStepAsCompleted(${step}) устарела!`);
    console.log(
      `Шаги теперь завершаются автоматически на основе данных PageData.`
    );
    console.log(
      `Для завершения шага ${step} обновите соответствующие поля в pageData:`,
      debugInfo[step]
    );
  };

  const canActivateStepLocal = (step: AdminPageTab): boolean => {
    return canActivateStep(step, completedSteps);
  };

  const isStepCompleted = (step: AdminPageTab): boolean => {
    return completedSteps.includes(step);
  };

  // ✅ ИСПРАВЛЕНО: Мемоизируем значение контекста для предотвращения лишних перерендеров
  const contextValue = useMemo(
    () => ({
      activeTab,
      setActiveTab,
      slug,
      indicatorStatuses,
      setIndicatorStatus,
      getIndicatorStatus,
      completedSteps,
      markStepAsCompleted,
      canActivateStep: canActivateStepLocal,
      isStepCompleted,
      displayMode,
      setDisplayMode,

      // ✅ НОВЫЕ ПОЛЯ: Интеграция с реальными данными
      pageData,
      isPageDataLoading,
      pageDataError,
      refreshPageData,
      debugInfo,
    }),
    [
      activeTab,
      slug,
      indicatorStatuses,
      completedSteps,
      displayMode,
      pageData,
      isPageDataLoading,
      pageDataError,
      refreshPageData,
      debugInfo,
    ]
  );

  return (
    <AdminPagesNavContext.Provider value={contextValue}>
      {children}
    </AdminPagesNavContext.Provider>
  );
}

export function useAdminPagesNav() {
  const context = useContext(AdminPagesNavContext);

  if (context === undefined) {
    throw new Error(
      "useAdminPagesNav must be used within an AdminPagesNavBarProvider"
    );
  }

  return context;
}
