interface SectionHeadingProps {
  title: string;
  description?: string;
}

export function SectionHeading({ title, description }: SectionHeadingProps) {
  return (
    <div className="border-b border-foreground/10 pb-2 mb-4">
      <h2 className="text-lg font-heading font-semibold text-foreground">
        {title}
      </h2>
      {description && (
        <p className="text-xs text-foreground/50 mt-0.5">{description}</p>
      )}
    </div>
  );
}
