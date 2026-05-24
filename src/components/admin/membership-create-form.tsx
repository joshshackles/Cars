import { addMembershipAction } from "@/actions/admin-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type RoleOption = {
  id: string;
  name: string;
  key: string;
};

export function MembershipCreateForm({ roles }: Readonly<{ roles: RoleOption[] }>) {
  return (
    <form action={addMembershipAction} className="grid gap-3 md:grid-cols-[1fr_1fr_14rem_auto]">
      <Input name="name" placeholder="Full name" required />
      <Input name="email" type="email" placeholder="email@example.org" required />
      <select name="roleId" required className="h-10 rounded-md border bg-background px-3 text-sm">
        {roles.map((role) => (
          <option key={role.id} value={role.id}>
            {role.name}
          </option>
        ))}
      </select>
      <Button type="submit">Add membership</Button>
    </form>
  );
}
