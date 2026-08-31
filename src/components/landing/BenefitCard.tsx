import { LucideIcon } from "lucide-react";

interface BenefitCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function BenefitCard({ icon: Icon, title, description }: BenefitCardProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-6 card-hover">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
          <p className="text-text-secondary text-sm leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
}
