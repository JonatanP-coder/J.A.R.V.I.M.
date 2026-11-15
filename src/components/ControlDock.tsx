import { SourceLinks } from './SourceLinks';
import { ContextualText } from './ContextualText';
import { componentConcept } from '../academy/adaptive';
import { useIntegratedText } from '../i18n/useIntegratedText';
import React, { useState, useRef } from 'react';
import { SpacecraftComponent } from '../types/mission';
import { COMPONENTS } from '../data/components';
import { sounds } from '../utils/audio';
import { ChevronDown, ChevronUp, Layers, Cpu, Sun, Wind, ShieldCheck, Flame, Radio } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { UI_COPY } from '../i18n/uiCopy';
import { getLocalizedComponent } from '../i18n/translations';
import { useAcademy } from '../context/AcademyContext';
import { componentExplanation } from '../academy/pedagogy';
import { announce } from '../services/accessibility';
import { GlossaryTerm } from './MissionTools';

interface ControlDockProps {
  selectedComponents: Record<string, SpacecraftComponent>;
  onSelectComponent: (component: SpacecraftComponent) => void;
  isExploded: boolean;
  onToggleExploded: () => void;
}

type TabType = 'capsule' | 'solar' | 'oxygen' | 'shield' | 'engine' | 'payload';

const TAB_ICONS: { id: TabType; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'capsule', icon: Cpu },
  { id: 'solar', icon: Sun },
  { id: 'oxygen', icon: Wind },
  { id: 'shield', icon: ShieldCheck },
  { id: 'engine', icon: Flame },
  { id: 'payload', icon: Radio },
];

export const ControlDock: React.FC<ControlDockProps> = ({
  selectedComponents,
  onSelectComponent,
  isExploded,
  onToggleExploded,
}) => {
  const tx = useIntegratedText();
  const { lang } = useI18n();
  const { profile, access } = useAcademy();
  const root = useRef<HTMLDivElement>(null);
  const swipeStart = useRef(0);
  const t = UI_COPY[lang].dock;

  const [activeTab, setActiveTab] = useState<TabType>('capsule');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  const categoryComponents = COMPONENTS.filter((c) => c.category === activeTab);
  const selectedLore = getLocalizedComponent(selectedComponents[activeTab], lang).nasaLore;
  const describe = (component: SpacecraftComponent) => {
    if (!access.narration) return;
    const description = (language: 'es' | 'en') => {
      const loc = getLocalizedComponent(component, language);
      return language === 'en'
        ? `${loc.name}. ${componentExplanation(component, profile, 'en')} ${component.weightKg} kilograms. ${component.powerW < 0 ? 'Generation' : 'Consumption'}: ${Math.abs(component.powerW)} watts. ${loc.nasaLore}`
        : `${loc.name}. ${componentExplanation(component, profile, 'es')} ${component.weightKg} kilogramos. ${component.powerW < 0 ? 'Generación' : 'Consumo'}: ${Math.abs(component.powerW)} vatios. ${loc.nasaLore}`;
    };
    announce({ es: description('es'), en: description('en') });
  };
  const moveCategory = (delta: number) => {
    const index = TAB_ICONS.findIndex(t => t.id === activeTab); const next = TAB_ICONS[(index + delta + TAB_ICONS.length) % TAB_ICONS.length].id;
    setActiveTab(next); setIsCollapsed(false);
    requestAnimationFrame(() => root.current?.querySelector<HTMLButtonElement>(`[data-category="${next}"]`)?.focus());
  };

  return (
    <div
      id="hangar-components" ref={root} tabIndex={-1} aria-label={tx("Ensamblaje de componentes")}
      onTouchStart={e => { swipeStart.current = e.touches[0].clientX; }}
      onTouchEnd={e => { const delta = e.changedTouches[0].clientX - swipeStart.current; if (Math.abs(delta) > 75) moveCategory(delta < 0 ? 1 : -1); }}
      onKeyDown={e => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); moveCategory(e.key === 'ArrowRight' ? 1 : -1); }
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault(); const items = Array.from(root.current!.querySelectorAll<HTMLButtonElement>('[data-component-name]'));
          const current = items.indexOf(document.activeElement as HTMLButtonElement); const next = current < 0 ? 0 : (current + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; items[next]?.focus();
        }
      }}
      className={`control-dock fixed left-1/2 -translate-x-1/2 z-20 w-[94vw] max-w-4xl transition-transform duration-300 pointer-events-auto select-none ${
        isCollapsed ? 'translate-y-[calc(100%-36px)]' : 'translate-y-0'
      }`}
      style={{ bottom: '16px' }}
    >
      {/* Collapse / Expand Toggle Button Header */}
      <div className="flex items-center justify-between mb-1 px-4">
        <button
          onClick={() => {
            sounds.playClick();
            onToggleExploded();
          }}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-t-lg text-xs font-mono font-medium border transition-colors shadow-sm cursor-pointer ${
            isExploded
              ? 'bg-blue-600 border-blue-400 text-white'
              : 'bg-slate-900/95 border-slate-700 text-slate-300 hover:text-white'
          }`}
          title={t.explodedTitle}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>{isExploded ? t.explodedOn : t.explodedOff}</span>
        </button>

        <button
          onClick={() => {
            sounds.playClick();
            setIsCollapsed(!isCollapsed);
          }}
          aria-expanded={!isCollapsed} aria-controls="component-tray"
          className="flex items-center gap-1.5 px-3 py-1 rounded-t-lg bg-slate-900/95 border border-slate-700 text-xs font-mono text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          {isCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>{isCollapsed ? t.showTray : t.hideTray}</span>
        </button>
      </div>

      {/* Main Glassmorphic Dock Container */}
      <div id="component-tray" inert={isCollapsed} className="bg-slate-950/95 border border-slate-800 rounded-2xl shadow-2xl p-3 sm:p-4">
        {/* Category Navigation Tabs */}
        <div role="tablist" aria-label={tx("Categorías de la nave")} className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-slate-800 scrollbar-none">
          {TAB_ICONS.map((tab) => {
            const Icon = tab.icon;
            const isTabActive = activeTab === tab.id;
            const currentSelected = selectedComponents[tab.id];

            return (
              <button
                role="tab" id={'category-' + tab.id} aria-selected={isTabActive} aria-controls="component-options" tabIndex={isTabActive ? 0 : -1} data-category={tab.id}
                onFocus={() => describe(currentSelected)}
                key={tab.id}
                onClick={() => {
                  sounds.playClick();
                  setActiveTab(tab.id);
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium font-['Chakra_Petch'] whitespace-nowrap transition-all cursor-pointer ${
                  isTabActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 font-semibold'
                    : 'bg-slate-900/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.tabs[tab.id]}</span>
                {currentSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-300" />
                )}
              </button>
            );
          })}
        </div>

        <div className="dock-nav-hint">{tx("← → Categorías · ↑ ↓ Piezas · Enter Instalar · R Estado")}</div>
        {profile?.mode === 'learn' && <div className="learning-strip"><ContextualText text={componentExplanation(selectedComponents[activeTab], profile, lang)} /> <GlossaryTerm term={componentConcept[selectedComponents[activeTab].category]}>{tx("Entender el concepto ↗")}</GlossaryTerm></div>}
        <div role="tabpanel" id="component-options" aria-labelledby={'category-' + activeTab} className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-3 max-h-52 overflow-y-auto pr-1">
          {categoryComponents.map((component) => {
            const isSelected = selectedComponents[activeTab]?.id === component.id;
            const loc = getLocalizedComponent(component, lang);

            return (
              <button
                type="button"
                key={component.id}
                data-component-name={loc.name}
                onFocus={() => describe(component)}
                onClick={() => {
                  sounds.playClick();
                  onSelectComponent(component);
                }}
                aria-pressed={isSelected}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between text-left ${
                  isSelected
                    ? 'bg-blue-950/80 border-blue-400/90 shadow-md shadow-blue-500/20 ring-1 ring-blue-400/50'
                    : 'bg-slate-900/80 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-white font-['Chakra_Petch'] line-clamp-1">
                      {loc.name}
                    </span>
                    {isSelected && (
                      <span className="px-1.5 py-0.5 rounded bg-blue-500 text-[10px] font-mono font-bold text-white uppercase">
                        {t.installed}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-snug">
                    {loc.description}
                  </p>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-800/80 w-full flex items-center justify-between text-[10px] font-mono text-slate-300">
                  <span className="tabular-nums">⚖️ {component.weightKg} kg</span>
                  <span className={`tabular-nums ${component.powerW < 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
                    {component.powerW < 0 ? `+${Math.abs(component.powerW)} W` : `-${component.powerW} W`}
                  </span>
                  <span className="tabular-nums text-slate-400">${(component.costUSD / 1000).toFixed(0)}k</span>
                </div>

                {component.isHeavyEngine && (
                  <div className="mt-1 text-[10px] font-mono text-amber-300 font-semibold">
                    {t.heavyBadge}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Component NASA Lore footer */}
        {selectedComponents[activeTab] && (
          <div className="mt-3 px-3 py-1.5 rounded-lg bg-blue-950/40 border border-blue-800/30 text-[11px] text-blue-200/90">
            <span className="font-mono font-semibold text-blue-400 uppercase text-[10px]">{t.lorePrefix}</span>
            <span> <ContextualText text={selectedLore} /></span>
            <SourceLinks sources={selectedComponents[activeTab].sources} model />
          </div>
        )}
      </div>
    </div>
  );
};

