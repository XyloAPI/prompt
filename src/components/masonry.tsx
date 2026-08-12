import { cn } from "@/lib/utils";

export function Masonry({
  children,
  className,
  cols = "columns-2 gap-4 sm:columns-2 md:columns-3 lg:columns-4",
}: {
  children: React.ReactNode;
  className?: string;
  cols?: string;
}) {
  return <div className={cn(cols, className)}>{children}</div>;
}

export function MasonryItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 break-inside-avoid", className)}>
      {children}
    </div>
  );
}
