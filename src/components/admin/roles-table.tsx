import { updateRolePermissionsAction } from "@/actions/admin-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type RoleRow = {
  id: string;
  name: string;
  key: string;
  isSystem: boolean;
  rolePermissions: {
    permission: {
      key: string;
    };
  }[];
  _count: {
    memberships: number;
  };
};

type PermissionOption = {
  id: string;
  key: string;
  name: string;
};

export function RolesTable({
  roles,
  permissions,
}: Readonly<{
  roles: RoleRow[];
  permissions: PermissionOption[];
}>) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Role</TableHead>
          <TableHead>Key</TableHead>
          <TableHead className="min-w-[22rem]">Permissions</TableHead>
          <TableHead>Members</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {roles.map((role) => (
          <TableRow key={role.id}>
            <TableCell className="font-medium">
              <div className="flex items-center gap-2">
                <span>{role.name}</span>
                {role.isSystem ? <Badge variant="outline">System</Badge> : null}
              </div>
            </TableCell>
            <TableCell>{role.key}</TableCell>
            <TableCell>
              <form id={`role-permissions-${role.id}`} action={updateRolePermissionsAction} className="grid gap-2 md:grid-cols-2">
                <input type="hidden" name="roleId" value={role.id} />
                {permissions.map((permission) => {
                  const checked = role.rolePermissions.some((item) => item.permission.key === permission.key);

                  return (
                    <label key={permission.id} className="flex items-center gap-2 text-xs">
                      <input
                        name="permissionKeys"
                        type="checkbox"
                        value={permission.key}
                        defaultChecked={checked}
                      />
                      <span>{permission.key}</span>
                    </label>
                  );
                })}
              </form>
            </TableCell>
            <TableCell>{role._count.memberships}</TableCell>
            <TableCell className="text-right">
              <Button form={`role-permissions-${role.id}`} type="submit" variant="outline" size="sm">
                Save permissions
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
