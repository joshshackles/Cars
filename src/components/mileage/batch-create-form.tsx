import { createReimbursementBatchAction } from "@/actions/mileage-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { dateInput } from "@/lib/mileage/mileage-utils";

type DriverOption = {
  id: string;
  displayName: string;
};

export function BatchCreateForm({ drivers }: Readonly<{ drivers: DriverOption[] }>) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create reimbursement batch</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={createReimbursementBatchAction} className="grid gap-3 md:grid-cols-[1fr_160px_160px_auto]">
          <select name="driverId" className="h-10 rounded-md border bg-background px-3 text-sm" required>
            <option value="">Select driver</option>
            {drivers.map((driver) => (
              <option key={driver.id} value={driver.id}>{driver.displayName}</option>
            ))}
          </select>
          <Input name="periodStart" type="date" defaultValue={dateInput(start)} />
          <Input name="periodEnd" type="date" defaultValue={dateInput(now)} />
          <Button type="submit">Batch approved mileage</Button>
        </form>
      </CardContent>
    </Card>
  );
}
