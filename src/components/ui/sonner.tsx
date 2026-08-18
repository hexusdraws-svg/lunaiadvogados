import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      closeButton
      duration={4000}
      position="top-right"
      toastOptions={{
        classNames: {
          toast:
            "group toast bg-card text-card-foreground border border-border shadow-lg rounded-xl px-4 py-3",
          description: "text-slate-300 text-sm mt-1",
          actionButton:
            "bg-primary text-primary-foreground hover:bg-primary/90 transition-colors rounded-lg px-3 py-1.5 text-sm font-medium",
          cancelButton:
            "bg-muted text-slate-300 hover:bg-muted/80 transition-colors rounded-lg px-3 py-1.5 text-sm font-medium",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
