import { Button } from "@/components/ui/button";

interface ArchiveFilterTabsProps {
  activeTab: "active" | "archived";
  onTabChange: (tab: "active" | "archived") => void;
  tabs: Array<{
    id: "active" | "archived";
    label: string;
  }>;
}

export function ArchiveFilterTabs({ activeTab, onTabChange, tabs }: ArchiveFilterTabsProps) {
  return (
    <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
      {tabs.map((tab) => (
        <Button
          key={tab.id}
          variant={activeTab === tab.id ? "default" : "ghost"}
          size="sm"
          onClick={() => onTabChange(tab.id)}
          className={`text-sm font-medium transition-colors ${
            activeTab === tab.id
              ? "bg-[#162828] shadow-sm text-foreground border border-white/[0.08]"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          }`}
        >
          {tab.label}
        </Button>
      ))}
    </div>
  );
}
