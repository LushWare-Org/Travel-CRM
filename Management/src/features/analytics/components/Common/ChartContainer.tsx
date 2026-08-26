import type { ReactNode } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';

interface ChartContainerProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}

const ChartContainer = ({ title, description, children, className = '', actions }: ChartContainerProps) => {
  return (
    <Card className={`shadow-card ${className}`}>
      <CardHeader className="flex-row items-center justify-between border-b pb-4">
        <div>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {actions ? (
          <div>{actions}</div>
        ) : (
          <Button variant="ghost" size="icon-sm">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
};

export default ChartContainer;
