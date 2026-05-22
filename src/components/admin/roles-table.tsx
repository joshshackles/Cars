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

export function RolesTable({ roles }: Readonly<{ roles: RoleRow[] }>) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Role</TableHead>
          <TableHead>Key</TableHead>
          <TableHead>Permissions</TableHead>
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
            <TableCell>{role.rolePermissions.length}</TableCell>
            <TableCell>{role._count.memberships}</TableCell>
            <TableCell className="text-right">
              <Button variant="outline" size="sm" disabled>
                Edit permissions
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
