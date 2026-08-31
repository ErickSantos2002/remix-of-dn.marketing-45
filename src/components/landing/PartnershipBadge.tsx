interface PartnershipBadgeProps {
  className?: string;
}

export const PartnershipBadge = ({ className = "" }: PartnershipBadgeProps) => {
  return (
    <div
      className={`inline-flex items-center gap-3 px-5 py-2 rounded-full border border-border/60 bg-card/60 backdrop-blur-xl shadow-[0_0_30px_hsl(var(--primary)/0.15)] ${className}`}
    >
      <span className="font-bold text-sm md:text-base text-primary tracking-tight">dn.ia</span>
      <span className="text-muted-foreground text-xs">×</span>
      <span className="font-bold text-sm md:text-base text-destructive tracking-tight uppercase">
        Grupo R1
      </span>
    </div>
  );
};
