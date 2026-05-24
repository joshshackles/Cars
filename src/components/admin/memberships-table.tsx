import { updateMembershipRoleAction } from "@/actions/admin-actions";
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

type MembershipRow = {
  id: string;
  createdAt: Date;
  organization: {
    name: string;
  };
  user: {
    name: string;
    email: string;
  };
  role: {
    id: string;
    name: string;
  };
};

export function MembershipsTable({
  memberships,
  roles,
}: Readonly<{
  memberships: MembershipRow[];
  roles: { id: string; name: string; key: string }[];
}>) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>User</TableHead>
          <TableHead>Organization</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Joined</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {memberships.map((membership) => (
          <TableRow key={membership.id}>
            <TableCell>
              <div className="flex flex-col gap-1">
                <span className="font-medium">{membership.user.name}</span>
                <span className="text-xs text-muted-foreground">{membership.user.email}</span>
              </div>
            </TableCell>
            <TableCell>{membership.organization.name}</TableCell>
            <TableCell>
              <Badge variant="secondary">{membership.role.name}</Badge>
            </TableCell>
            <TableCell>{membership.createdAt.toLocaleDateString()}</TableCell>
            <TableCell className="text-right">
              <form action={updateMembershipRoleAction} className="flex justify-end gap-2">
                <input type="hidden" name="membershipId" value={membership.id} />
                <select
                  name="roleId"
                  defaultValue={membership.role.id}
                  className="h-9 rounded-md border bg-background px-2 text-sm"
                >
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
                <Button type="submit" variant="outline" size="sm">
                  Change role
                </Button>
              </form>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
