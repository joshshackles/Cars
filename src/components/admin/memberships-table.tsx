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
    name: string;
  };
};

export function MembershipsTable({
  memberships,
}: Readonly<{
  memberships: MembershipRow[];
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
              <Button variant="outline" size="sm" disabled>
                Change role
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
