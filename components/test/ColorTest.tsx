// components/test/ColorTest.tsx
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FiArrowRight } from "react-icons/fi";

export const ColorTest = () => {
  return (
    <div className="p-8 space-y-4 bg-secondary min-h-screen">
      {/* Basic colors */}
      <div className="space-y-2">
        <div className="bg-primary p-4">Primary (White)</div>
        <div className="bg-secondary p-4">Secondary (Light Gray)</div>
        <div className="bg-tertiary text-primary p-4">
          Tertiary (Almost Black)
        </div>
        <div className="bg-quaternary text-primary p-4">
          Quaternary (Lighter Black)
        </div>
      </div>

      {/* Status colors */}
      <div className="space-y-2">
        <div className="bg-success/10 text-success p-4">Success Message</div>
        <div className="bg-warning/10 text-warning p-4">Warning Message</div>
        <div className="bg-error/10 text-error p-4">Error Message</div>
        <div className="bg-info/10 text-info p-4">Info Message</div>
      </div>

      {/* shadcn components */}
      <Card className="p-4">
        <h3 className="text-tertiary font-semibold mb-2">Card Example</h3>
        <p className="text-quaternary">Card content using our color scheme</p>
        <Button className="mt-4 bg-tertiary text-primary hover:bg-quaternary">
          Action <FiArrowRight className="ml-2" />
        </Button>
      </Card>
    </div>
  );
};
