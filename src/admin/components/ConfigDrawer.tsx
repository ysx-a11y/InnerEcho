import React from 'react';
import { Check, RotateCcw, Settings } from 'lucide-react';
import { Button } from './ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './ui/sheet';
import { useSidebar } from './ui/sidebar';
import {
  useTheme,
  type Direction,
  type SidebarCollapsible,
  type SidebarVariant,
  type Theme,
} from './theme-provider';
import { cn } from '../lib/utils';

/* -------------------------------------------------------------------------- */
/*                               SVG Previews                                 */
/* -------------------------------------------------------------------------- */

const SvgThemeSystem: React.FC = () => (
  <svg viewBox="0 0 100 66" className="h-full w-full rounded-[5px]" fill="none">
    <rect width="100" height="66" rx="5" fill="#f8fafc" />
    <path d="M0 5C0 2.23858 2.23858 0 5 0H30V66H5C2.23858 66 0 63.7614 0 61V5Z" fill="#cbd5e1" />
    <circle cx="8.5" cy="9.5" r="4" fill="#f8fafc" />
    <rect x="15" y="7" width="10" height="2" rx="1" fill="#f8fafc" />
    <rect x="15" y="10.5" width="7" height="1.8" rx="0.9" fill="#f8fafc" />
    <rect x="5" y="18" width="18" height="2" rx="1" fill="#f8fafc" />
    <rect x="5" y="22.5" width="18" height="2" rx="1" fill="#f8fafc" />
    <rect x="5" y="27" width="18" height="2" rx="1" fill="#f8fafc" />
    {/* Bar chart */}
    <rect x="38" y="24" width="3" height="10" rx="1" fill="#94a3b8" />
    <rect x="43" y="28" width="3" height="6" rx="1" fill="#94a3b8" />
    <rect x="48" y="20" width="3" height="14" rx="1" fill="#94a3b8" />
    <rect x="53" y="16" width="3" height="18" rx="1" fill="#94a3b8" />
    {/* Pie chart */}
    <circle cx="79" cy="23" r="10.5" fill="#94a3b8" />
    <path d="M79 12.5A10.5 10.5 0 0 1 89.5 23H79V12.5Z" fill="#cbd5e1" />
    {/* Bottom card */}
    <rect x="38" y="39" width="52" height="20" rx="3" fill="#cbd5e1" />
  </svg>
);

const SvgThemeLight: React.FC = () => (
  <svg viewBox="0 0 100 66" className="h-full w-full rounded-[5px]" fill="none">
    <rect width="100" height="66" rx="5" fill="#e2e8f0" />
    <path d="M0 5C0 2.23858 2.23858 0 5 0H30V66H5C2.23858 66 0 63.7614 0 61V5Z" fill="#cbd5e1" />
    <circle cx="8.5" cy="9.5" r="4" fill="#ffffff" />
    <rect x="15" y="7" width="10" height="2" rx="1" fill="#ffffff" />
    <rect x="15" y="10.5" width="7" height="1.8" rx="0.9" fill="#ffffff" />
    <rect x="5" y="18" width="18" height="2" rx="1" fill="#ffffff" />
    <rect x="5" y="22.5" width="18" height="2" rx="1" fill="#ffffff" />
    <rect x="5" y="27" width="18" height="2" rx="1" fill="#ffffff" />
    {/* Bar chart */}
    <rect x="38" y="24" width="3" height="10" rx="1" fill="#cbd5e1" />
    <rect x="43" y="28" width="3" height="6" rx="1" fill="#cbd5e1" />
    <rect x="48" y="20" width="3" height="14" rx="1" fill="#cbd5e1" />
    <rect x="53" y="16" width="3" height="18" rx="1" fill="#cbd5e1" />
    {/* Pie chart */}
    <circle cx="79" cy="23" r="10.5" fill="#ffffff" />
    <path d="M79 12.5A10.5 10.5 0 0 1 89.5 23H79V12.5Z" fill="#cbd5e1" />
    {/* Bottom card */}
    <rect x="38" y="39" width="52" height="20" rx="3" fill="#ffffff" />
  </svg>
);

const SvgThemeDark: React.FC = () => (
  <svg viewBox="0 0 100 66" className="h-full w-full rounded-[5px]" fill="none">
    <rect width="100" height="66" rx="5" fill="#090d16" />
    <path d="M0 5C0 2.23858 2.23858 0 5 0H30V66H5C2.23858 66 0 63.7614 0 61V5Z" fill="#161f30" />
    <circle cx="8.5" cy="9.5" r="4" fill="#334155" />
    <rect x="15" y="7" width="10" height="2" rx="1" fill="#334155" />
    <rect x="15" y="10.5" width="7" height="1.8" rx="0.9" fill="#334155" />
    <rect x="5" y="18" width="18" height="2" rx="1" fill="#334155" />
    <rect x="5" y="22.5" width="18" height="2" rx="1" fill="#334155" />
    <rect x="5" y="27" width="18" height="2" rx="1" fill="#334155" />
    {/* Bar chart */}
    <rect x="38" y="24" width="3" height="10" rx="1" fill="#1e293b" />
    <rect x="43" y="28" width="3" height="6" rx="1" fill="#1e293b" />
    <rect x="48" y="20" width="3" height="14" rx="1" fill="#1e293b" />
    <rect x="53" y="16" width="3" height="18" rx="1" fill="#1e293b" />
    {/* Pie chart */}
    <circle cx="79" cy="23" r="10.5" fill="#1e293b" />
    <path d="M79 12.5A10.5 10.5 0 0 1 89.5 23H79V12.5Z" fill="#334155" />
    {/* Bottom card */}
    <rect x="38" y="39" width="52" height="20" rx="3" fill="#161f30" />
  </svg>
);

const SvgSidebarInset: React.FC = () => (
  <svg viewBox="0 0 100 66" className="h-full w-full rounded-[5px]" fill="none">
    <rect width="100" height="66" rx="5" fill="#ffffff" />
    <circle cx="9.5" cy="11.5" r="3.5" fill="#475569" />
    <rect x="15" y="9.5" width="9" height="1.8" rx="0.9" fill="#475569" />
    <rect x="15" y="12.5" width="6" height="1.6" rx="0.8" fill="#475569" />
    <rect x="6" y="19" width="17" height="2" rx="1" fill="#64748b" />
    <rect x="6" y="23.5" width="17" height="2" rx="1" fill="#64748b" />
    <rect x="6" y="28" width="17" height="2" rx="1" fill="#64748b" />
    <rect x="29" y="5" width="66" height="56" rx="4" fill="#cbd5e1" />
  </svg>
);

const SvgSidebarFloating: React.FC = () => (
  <svg viewBox="0 0 100 66" className="h-full w-full rounded-[5px]" fill="none">
    <rect width="100" height="66" rx="5" fill="#ffffff" />
    <rect x="5" y="5" width="26" height="56" rx="4" fill="#64748b" />
    <circle cx="11.5" cy="12" r="3.5" fill="#f8fafc" />
    <rect x="17" y="10" width="9" height="1.8" rx="0.9" fill="#f8fafc" />
    <rect x="17" y="13" width="6" height="1.6" rx="0.8" fill="#f8fafc" />
    <rect x="9" y="20" width="18" height="2" rx="1" fill="#e2e8f0" />
    <rect x="9" y="24.5" width="18" height="2" rx="1" fill="#e2e8f0" />
    <rect x="9" y="29" width="18" height="2" rx="1" fill="#e2e8f0" />
    <rect x="36" y="10" width="10" height="3" rx="1.5" fill="#94a3b8" />
    <rect x="36" y="16" width="34" height="4" rx="2" fill="#cbd5e1" />
    <rect x="36" y="23" width="56" height="34" rx="3" fill="#cbd5e1" />
  </svg>
);

const SvgSidebarStandard: React.FC = () => (
  <svg viewBox="0 0 100 66" className="h-full w-full rounded-[5px]" fill="none">
    <rect width="100" height="66" rx="5" fill="#ffffff" />
    <circle cx="9.5" cy="10.5" r="3.5" fill="#64748b" />
    <rect x="15" y="8.5" width="9" height="1.8" rx="0.9" fill="#64748b" />
    <rect x="15" y="11.5" width="6" height="1.6" rx="0.8" fill="#64748b" />
    <rect x="6" y="18" width="17" height="2" rx="1" fill="#94a3b8" />
    <rect x="6" y="22.5" width="17" height="2" rx="1" fill="#94a3b8" />
    <rect x="6" y="27" width="17" height="2" rx="1" fill="#94a3b8" />
    <path d="M29 0H95C97.7614 0 100 2.23858 100 5V61C100 63.7614 97.7614 66 95 66H29V0Z" fill="#cbd5e1" />
  </svg>
);

const SvgLayoutDefault: React.FC = () => (
  <svg viewBox="0 0 100 66" className="h-full w-full rounded-[5px]" fill="none">
    <rect width="100" height="66" rx="5" fill="#ffffff" />
    <rect x="4" y="4" width="25" height="58" rx="3" fill="#334155" />
    <circle cx="10.5" cy="11" r="3.5" fill="#f8fafc" />
    <rect x="16" y="9" width="9" height="1.8" rx="0.9" fill="#f8fafc" />
    <rect x="16" y="12" width="6" height="1.6" rx="0.8" fill="#f8fafc" />
    <rect x="8" y="19" width="17" height="2" rx="1" fill="#cbd5e1" />
    <rect x="8" y="23.5" width="17" height="2" rx="1" fill="#cbd5e1" />
    <rect x="8" y="28" width="17" height="2" rx="1" fill="#cbd5e1" />
    {/* Right content */}
    <rect x="35" y="6" width="58" height="4" rx="2" fill="#334155" />
    <rect x="35" y="14" width="14" height="3.5" rx="1.75" fill="#64748b" />
    <rect x="35" y="20" width="26" height="4" rx="2" fill="#94a3b8" />
    <rect x="35" y="27" width="28" height="29" rx="3" fill="#94a3b8" />
    <circle cx="78" cy="24" r="10" fill="#64748b" />
    <path d="M78 14A10 10 0 0 1 88 24H78V14Z" fill="#94a3b8" />
    <rect x="69" y="46" width="3" height="10" rx="1" fill="#64748b" />
    <rect x="74" y="50" width="3" height="6" rx="1" fill="#64748b" />
    <rect x="79" y="42" width="3" height="14" rx="1" fill="#64748b" />
    <rect x="84" y="38" width="3" height="18" rx="1" fill="#64748b" />
  </svg>
);

const SvgLayoutCompact: React.FC = () => (
  <svg viewBox="0 0 100 66" className="h-full w-full rounded-[5px]" fill="none">
    <rect width="100" height="66" rx="5" fill="#ffffff" />
    {/* Narrow icon rail */}
    <rect x="5" y="4" width="6" height="58" rx="3" fill="#64748b" />
    <circle cx="8" cy="9" r="1.5" fill="#f8fafc" />
    <rect x="6.5" y="14" width="3" height="2" rx="0.8" fill="#e2e8f0" />
    <rect x="6.5" y="18" width="3" height="2" rx="0.8" fill="#e2e8f0" />
    <rect x="6.5" y="22" width="3" height="2" rx="0.8" fill="#e2e8f0" />
    {/* Wide content */}
    <rect x="17" y="6" width="76" height="4" rx="2" fill="#64748b" />
    <rect x="17" y="14" width="13" height="3.5" rx="1.75" fill="#94a3b8" />
    <rect x="17" y="20" width="26" height="4" rx="2" fill="#cbd5e1" />
    <rect x="17" y="27" width="42" height="29" rx="3" fill="#cbd5e1" />
    <circle cx="78" cy="24" r="10" fill="#94a3b8" />
    <path d="M78 14A10 10 0 0 1 88 24H78V14Z" fill="#cbd5e1" />
    <rect x="69" y="46" width="3" height="10" rx="1" fill="#94a3b8" />
    <rect x="74" y="50" width="3" height="6" rx="1" fill="#94a3b8" />
    <rect x="79" y="42" width="3" height="14" rx="1" fill="#94a3b8" />
    <rect x="84" y="38" width="3" height="18" rx="1" fill="#94a3b8" />
  </svg>
);

const SvgLayoutFull: React.FC = () => (
  <svg viewBox="0 0 100 66" className="h-full w-full rounded-[5px]" fill="none">
    <rect width="100" height="66" rx="5" fill="#ffffff" />
    <rect x="7" y="6" width="86" height="4" rx="2" fill="#64748b" />
    <rect x="7" y="14" width="14" height="3.5" rx="1.75" fill="#94a3b8" />
    <rect x="7" y="20" width="28" height="4" rx="2" fill="#cbd5e1" />
    <rect x="7" y="27" width="48" height="29" rx="3" fill="#cbd5e1" />
    <circle cx="78" cy="24" r="10" fill="#94a3b8" />
    <path d="M78 14A10 10 0 0 1 88 24H78V14Z" fill="#cbd5e1" />
    <rect x="69" y="46" width="3" height="10" rx="1" fill="#94a3b8" />
    <rect x="74" y="50" width="3" height="6" rx="1" fill="#94a3b8" />
    <rect x="79" y="42" width="3" height="14" rx="1" fill="#94a3b8" />
    <rect x="84" y="38" width="3" height="18" rx="1" fill="#94a3b8" />
  </svg>
);

const SvgDirLtr: React.FC = () => (
  <svg viewBox="0 0 100 66" className="h-full w-full rounded-[5px]" fill="none">
    <rect width="100" height="66" rx="5" fill="#ffffff" />
    <circle cx="9.5" cy="10.5" r="3.5" fill="#475569" />
    <rect x="15" y="8.5" width="9" height="1.8" rx="0.9" fill="#475569" />
    <rect x="15" y="11.5" width="6" height="1.6" rx="0.8" fill="#475569" />
    <rect x="6" y="18" width="17" height="2" rx="1" fill="#64748b" />
    <rect x="6" y="22.5" width="17" height="2" rx="1" fill="#64748b" />
    <rect x="6" y="27" width="17" height="2" rx="1" fill="#64748b" />
    <path d="M29 0H95C97.7614 0 100 2.23858 100 5V61C100 63.7614 97.7614 66 95 66H29V0Z" fill="#cbd5e1" />
    <rect x="35" y="8" width="10" height="3" rx="1.5" fill="#64748b" />
    <rect x="35" y="14" width="34" height="4" rx="2" fill="#94a3b8" />
    <rect x="35" y="21" width="56" height="17" rx="2.5" fill="#94a3b8" />
    <rect x="35" y="41" width="56" height="9" rx="2" fill="#94a3b8" />
    <rect x="35" y="53" width="44" height="6" rx="2" fill="#94a3b8" />
  </svg>
);

const SvgDirRtl: React.FC = () => (
  <svg viewBox="0 0 100 66" className="h-full w-full rounded-[5px]" fill="none">
    <rect width="100" height="66" rx="5" fill="#ffffff" />
    <path d="M5 0H71V66H5C2.23858 66 0 63.7614 0 61V5C0 2.23858 2.23858 0 5 0Z" fill="#e2e8f0" />
    <rect x="55" y="8" width="10" height="3" rx="1.5" fill="#94a3b8" />
    <rect x="31" y="14" width="34" height="4" rx="2" fill="#cbd5e1" />
    <rect x="9" y="21" width="56" height="17" rx="2.5" fill="#cbd5e1" />
    <rect x="9" y="41" width="56" height="9" rx="2" fill="#cbd5e1" />
    <rect x="21" y="53" width="44" height="6" rx="2" fill="#cbd5e1" />
    {/* Right sidebar */}
    <circle cx="90.5" cy="10.5" r="3.5" fill="#94a3b8" />
    <rect x="76" y="8.5" width="9" height="1.8" rx="0.9" fill="#94a3b8" />
    <rect x="79" y="11.5" width="6" height="1.6" rx="0.8" fill="#94a3b8" />
    <rect x="77" y="18" width="17" height="2" rx="1" fill="#94a3b8" />
    <rect x="77" y="22.5" width="17" height="2" rx="1" fill="#94a3b8" />
    <rect x="77" y="27" width="17" height="2" rx="1" fill="#94a3b8" />
  </svg>
);

/* -------------------------------------------------------------------------- */
/*                            Helper Subcomponents                            */
/* -------------------------------------------------------------------------- */

interface SectionTitleProps {
  title: string;
  showReset?: boolean;
  onReset?: () => void;
}

const SectionTitle: React.FC<SectionTitleProps> = ({
  title,
  showReset = false,
  onReset,
}) => (
  <div className="mb-2.5 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
    <span>{title}</span>
    {showReset && onReset && (
      <Button
        type="button"
        size="icon"
        variant="secondary"
        className="size-4 rounded-full cursor-pointer"
        onClick={onReset}
        title={`重置${title}`}
      >
        <RotateCcw className="size-2.5" />
      </Button>
    )}
  </div>
);

interface RadioCardItemProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  icon: React.ComponentType;
}

const RadioCardItem: React.FC<RadioCardItemProps> = ({
  label,
  selected,
  onClick,
  icon: Icon,
}) => (
  <button
    type="button"
    role="radio"
    aria-checked={selected}
    aria-label={label}
    onClick={onClick}
    className="group flex flex-col items-center gap-1.5 text-start outline-hidden cursor-pointer"
  >
    <div
      className={cn(
        'relative w-full aspect-[100/66] rounded-md border border-border bg-muted/20 p-0.5 transition-all',
        selected
          ? 'ring-2 ring-foreground border-foreground shadow-xs'
          : 'hover:border-foreground/50'
      )}
    >
      <Icon />
      {selected && (
        <span className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-foreground text-background shadow-xs">
          <Check className="size-2.5 stroke-[3]" />
        </span>
      )}
    </div>
    <span
      className={cn(
        'text-xs transition-colors',
        selected ? 'font-medium text-foreground' : 'text-muted-foreground group-hover:text-foreground'
      )}
    >
      {label}
    </span>
  </button>
);

/* -------------------------------------------------------------------------- */
/*                                ConfigDrawer                                */
/* -------------------------------------------------------------------------- */

export const ConfigDrawer: React.FC = () => {
  const { open, setOpen } = useSidebar();
  const {
    theme,
    setTheme,
    variant,
    setVariant,
    collapsible,
    setCollapsible,
    dir,
    setDir,
    resetConfig,
  } = useTheme();

  const layoutState: 'default' | SidebarCollapsible = open ? 'default' : collapsible;

  const handleResetAll = () => {
    setOpen(true);
    resetConfig();
  };

  const themeOptions: { value: Theme; label: string; icon: React.ComponentType }[] = [
    { value: 'system', label: '跟随系统', icon: SvgThemeSystem },
    { value: 'light', label: '明亮浅色', icon: SvgThemeLight },
    { value: 'dark', label: '暗夜深色', icon: SvgThemeDark },
  ];

  const sidebarOptions: {
    value: SidebarVariant;
    label: string;
    icon: React.ComponentType;
  }[] = [
    { value: 'inset', label: '内嵌模式', icon: SvgSidebarInset },
    { value: 'floating', label: '悬浮模式', icon: SvgSidebarFloating },
    { value: 'sidebar', label: '经典侧栏', icon: SvgSidebarStandard },
  ];

  const layoutOptions: {
    value: 'default' | SidebarCollapsible;
    label: string;
    icon: React.ComponentType;
  }[] = [
    { value: 'default', label: '默认展开', icon: SvgLayoutDefault },
    { value: 'icon', label: '紧凑折叠', icon: SvgLayoutCompact },
    { value: 'offcanvas', label: '全屏宽幅', icon: SvgLayoutFull },
  ];

  const dirOptions: { value: Direction; label: string; icon: React.ComponentType }[] = [
    { value: 'ltr', label: '从左到右', icon: SvgDirLtr },
    { value: 'rtl', label: '从右到左', icon: SvgDirRtl },
  ];

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="主题设置"
          title="主题与布局设置"
          className="size-8 rounded-full cursor-pointer"
        >
          <Settings className="size-4" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side={dir === 'rtl' ? 'left' : 'right'}
        className="flex flex-col sm:max-w-sm"
      >
        <SheetHeader className="pb-0 text-start">
          <SheetTitle className="text-lg font-bold tracking-tight">
            主题设置
          </SheetTitle>
          <SheetDescription className="text-xs leading-relaxed">
            调整界面外观、侧边栏形态与布局方向以契合您的使用偏好。
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-4 py-2">
          {/* 1. Theme */}
          <div role="radiogroup" aria-label="主题模式">
            <SectionTitle
              title="主题模式"
              showReset={theme !== 'system'}
              onReset={() => setTheme('system')}
            />
            <div className="grid grid-cols-3 gap-3.5">
              {themeOptions.map((item) => (
                <RadioCardItem
                  key={item.value}
                  label={item.label}
                  selected={theme === item.value}
                  onClick={() => setTheme(item.value)}
                  icon={item.icon}
                />
              ))}
            </div>
          </div>

          {/* 2. Sidebar Variant */}
          <div role="radiogroup" aria-label="侧边栏样式">
            <SectionTitle
              title="侧边栏样式"
              showReset={variant !== 'inset'}
              onReset={() => setVariant('inset')}
            />
            <div className="grid grid-cols-3 gap-3.5">
              {sidebarOptions.map((item) => (
                <RadioCardItem
                  key={item.value}
                  label={item.label}
                  selected={variant === item.value}
                  onClick={() => setVariant(item.value)}
                  icon={item.icon}
                />
              ))}
            </div>
          </div>

          {/* 3. Layout Mode */}
          <div role="radiogroup" aria-label="布局模式">
            <SectionTitle
              title="布局模式"
              showReset={layoutState !== 'default'}
              onReset={() => {
                setOpen(true);
                setCollapsible('icon');
              }}
            />
            <div className="grid grid-cols-3 gap-3.5">
              {layoutOptions.map((item) => (
                <RadioCardItem
                  key={item.value}
                  label={item.label}
                  selected={layoutState === item.value}
                  onClick={() => {
                    if (item.value === 'default') {
                      setOpen(true);
                      return;
                    }
                    setOpen(false);
                    setCollapsible(item.value);
                  }}
                  icon={item.icon}
                />
              ))}
            </div>
          </div>

          {/* 4. Direction */}
          <div role="radiogroup" aria-label="排版方向">
            <SectionTitle
              title="排版方向"
              showReset={dir !== 'ltr'}
              onReset={() => setDir('ltr')}
            />
            <div className="grid grid-cols-3 gap-3.5">
              {dirOptions.map((item) => (
                <RadioCardItem
                  key={item.value}
                  label={item.label}
                  selected={dir === item.value}
                  onClick={() => setDir(item.value)}
                  icon={item.icon}
                />
              ))}
            </div>
          </div>
        </div>

        <SheetFooter className="border-t border-border/40 pt-3">
          <Button
            type="button"
            variant="destructive"
            onClick={handleResetAll}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold cursor-pointer"
          >
            恢复默认设置
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

