import { createRoleAction } from "@/actions/admin-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PermissionOption = {
  id: string;
  key: string;
  name: string;
};

export function RoleCreateForm({ permissions }: Readonly<{ permissions: PermissionOption[] }>) {
  return (
    <form action={createRoleAction} className="flex flex-col gap-4">
      <div className="grid gap-3 md:grid-cols-3">
        <Input name="name" placeholder="Role name" required />
        <Input name="key" placeholder="role_key" required />
        <Input name="description" placeholder="Description" />
      </div>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {permissions.map((permission) => (
          <label key={permission.id} className="flex items-start gap-2 rounded-md border p-3 text-sm">
            <input name="permissionKeys" type="checkbox" value={permission.key} className="mt-1" />
            <span>
              <span className="block font-semibold text-slate-900">{permission.name}</span>
              <span className="block text-xs text-slate-500">{permission.key}</span>
            </span>
          </label>
        ))}
      </div>
      <Button type="submit" className="w-fit">Create role</Button>
    </form>
  );
}
