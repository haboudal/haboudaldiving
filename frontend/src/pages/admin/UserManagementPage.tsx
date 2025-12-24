import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Loader2,
  Search,
  Users,
  Filter,
  MoreVertical,
  UserCog,
  Ban,
  CheckCircle,
  Mail,
  Calendar,
  Shield,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { adminApi } from '@/api/admin';
import { formatDate } from '@/lib/utils';
import type { UserRole, UserStatus } from '@/types';

const statusColors: Record<UserStatus, string> = {
  active: 'bg-green-100 text-green-700',
  pending_verification: 'bg-yellow-100 text-yellow-700',
  suspended: 'bg-red-100 text-red-700',
  deactivated: 'bg-gray-100 text-gray-700',
};

const roleColors: Record<UserRole, string> = {
  diver: 'bg-blue-100 text-blue-700',
  instructor: 'bg-purple-100 text-purple-700',
  center_owner: 'bg-cyan-100 text-cyan-700',
  admin: 'bg-red-100 text-red-700',
  parent: 'bg-orange-100 text-orange-700',
};

export function UserManagementPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [showActions, setShowActions] = useState<string | null>(null);
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', roleFilter, statusFilter, page, searchTerm],
    queryFn: () => adminApi.getUsers({
      role: roleFilter !== 'all' ? roleFilter as UserRole : undefined,
      status: statusFilter !== 'all' ? statusFilter as UserStatus : undefined,
      search: searchTerm || undefined,
      page,
      limit,
    }),
  });

  const suspendMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      adminApi.suspendUser(userId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setShowActions(null);
    },
  });

  const activateMutation = useMutation({
    mutationFn: (userId: string) => adminApi.activateUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setShowActions(null);
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) =>
      adminApi.updateUser(userId, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setShowActions(null);
    },
  });

  const users = data?.users || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const handleSuspend = (userId: string) => {
    const reason = prompt(t('admin.suspendReason', 'Enter suspension reason:'));
    if (reason) {
      suspendMutation.mutate({ userId, reason });
    }
  };

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">{t('admin.userManagement', 'User Management')}</h1>
        <p className="mt-1 text-muted-foreground">
          {t('admin.userManagementDescription', 'View and manage platform users')}
        </p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{total}</p>
                <p className="text-sm text-muted-foreground">{t('admin.totalUsers', 'Total Users')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {users.filter(u => u.status === 'active').length}
                </p>
                <p className="text-sm text-muted-foreground">{t('admin.activeUsers', 'Active')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100">
                <Mail className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {users.filter(u => u.status === 'pending_verification').length}
                </p>
                <p className="text-sm text-muted-foreground">{t('admin.pendingVerification', 'Pending')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <Ban className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {users.filter(u => u.status === 'suspended').length}
                </p>
                <p className="text-sm text-muted-foreground">{t('admin.suspendedUsers', 'Suspended')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('admin.searchUsers', 'Search by email or name...')}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <Filter className="me-2 h-4 w-4" />
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.allRoles', 'All Roles')}</SelectItem>
                <SelectItem value="diver">{t('roles.diver', 'Diver')}</SelectItem>
                <SelectItem value="instructor">{t('roles.instructor', 'Instructor')}</SelectItem>
                <SelectItem value="center_owner">{t('roles.centerOwner', 'Center Owner')}</SelectItem>
                <SelectItem value="admin">{t('roles.admin', 'Admin')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="me-2 h-4 w-4" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.allStatuses', 'All Statuses')}</SelectItem>
                <SelectItem value="active">{t('status.active', 'Active')}</SelectItem>
                <SelectItem value="pending_verification">{t('status.pendingVerification', 'Pending Verification')}</SelectItem>
                <SelectItem value="suspended">{t('status.suspended', 'Suspended')}</SelectItem>
                <SelectItem value="deactivated">{t('status.deactivated', 'Deactivated')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      {isLoading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">
              {t('admin.noUsers', 'No users found')}
            </h3>
            <p className="mt-1 text-muted-foreground">
              {t('admin.noUsersFilter', 'Try adjusting your filters')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <Card key={user.id}>
              <CardContent className="p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                      <Users className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{user.email}</h3>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${roleColors[user.role]}`}>
                          {user.role.replace('_', ' ')}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[user.status]}`}>
                          {user.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Joined {formatDate(user.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {user.status === 'suspended' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => activateMutation.mutate(user.id)}
                        disabled={activateMutation.isPending}
                      >
                        {activateMutation.isPending ? (
                          <Loader2 className="me-1 h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle className="me-1 h-4 w-4" />
                        )}
                        {t('admin.activate', 'Activate')}
                      </Button>
                    ) : user.status === 'active' && user.role !== 'admin' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSuspend(user.id)}
                        disabled={suspendMutation.isPending}
                        className="text-destructive hover:text-destructive"
                      >
                        {suspendMutation.isPending ? (
                          <Loader2 className="me-1 h-4 w-4 animate-spin" />
                        ) : (
                          <Ban className="me-1 h-4 w-4" />
                        )}
                        {t('admin.suspend', 'Suspend')}
                      </Button>
                    ) : null}

                    {/* More Actions */}
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowActions(showActions === user.id ? null : user.id)}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                      {showActions === user.id && (
                        <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-md border bg-background shadow-lg">
                          <div className="p-2">
                            <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
                              {t('admin.changeRole', 'Change Role')}
                            </p>
                            {(['diver', 'instructor', 'center_owner', 'admin'] as UserRole[]).map((role) => (
                              <button
                                key={role}
                                className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted ${
                                  user.role === role ? 'bg-muted font-medium' : ''
                                }`}
                                onClick={() => {
                                  if (user.role !== role) {
                                    updateRoleMutation.mutate({ userId: user.id, role });
                                  }
                                }}
                                disabled={updateRoleMutation.isPending}
                              >
                                <Shield className="h-4 w-4" />
                                {role.replace('_', ' ')}
                                {user.role === role && <CheckCircle className="ms-auto h-4 w-4 text-green-600" />}
                              </button>
                            ))}
                          </div>
                          <div className="border-t p-2">
                            <button
                              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
                              onClick={() => {
                                // View user details - could navigate to user detail page
                                setShowActions(null);
                              }}
                            >
                              <UserCog className="h-4 w-4" />
                              {t('admin.viewDetails', 'View Details')}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t('common.showingResults', 'Showing {{start}}-{{end}} of {{total}} users', {
              start: (page - 1) * limit + 1,
              end: Math.min(page * limit, total),
              total,
            })}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              {t('common.previous', 'Previous')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              {t('common.next', 'Next')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
