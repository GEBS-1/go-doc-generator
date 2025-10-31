import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  number: number;
  title: string;
  description: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
}

export const StepIndicator = ({ steps, currentStep }: StepIndicatorProps) => {
  return (
    <div className="w-full mb-12">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = step.number < currentStep;
          const isCurrent = step.number === currentStep;
          
          return (
            <div key={step.number} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className="flex items-center w-full">
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all",
                      isCompleted && "bg-success border-success text-success-foreground",
                      isCurrent && "border-primary bg-primary text-primary-foreground shadow-glow",
                      !isCompleted && !isCurrent && "border-muted bg-background text-muted-foreground"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-6 w-6" />
                    ) : (
                      <span className="font-bold">{step.number}</span>
                    )}
                  </div>
                  
                  {index < steps.length - 1 && (
                    <div
                      className={cn(
                        "h-0.5 flex-1 transition-all",
                        isCompleted ? "bg-success" : "bg-muted"
                      )}
                    />
                  )}
                </div>
                
                <div className="mt-3 text-center hidden sm:block">
                  <p
                    className={cn(
                      "text-sm font-semibold transition-colors",
                      isCurrent && "text-primary",
                      !isCurrent && "text-muted-foreground"
                    )}
                  >
                    {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 hidden md:block">
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
