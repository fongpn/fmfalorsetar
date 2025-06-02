import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth'; // Removed adminRoles as it's part of useAuth or directly checkable
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { formatDateTime } from '@/lib/utils';
import { Plus, Search, UserCog, Shield, Power } from 'lucide-react';
import type { User, UserRole } from '@/types'; // Added UserRole for clarity

const UsersPage = () => {
  const { user: adminUser, hasPermission } = useAuth(); // Renamed user to adminUser to avoid conflict
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false); // Changed from isAddingUser for clarity
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [newUser, setNewUser] = useState({
    email: '',
    name: '',
    role: 'cashier' as UserRole,
    password: '',
  });

  const fetchUsers = async () => {
    if (!adminUser) return;
    setIsLoading(true);
    try {
      // get_accessible_users RPC is fine to keep if its logic is sound for visibility
      const { data, error } = await supabase.rpc('get_accessible_users', {
        admin_id: adminUser.id,
      });

      if (error) throw error;
      setUsers(data as User[] || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [adminUser, toast]); // fetchUsers can be memoized or defined inside if preferred

  const handleAddUser = async () => {
    if (!adminUser) return;
    setIsProcessing(true);
    try {
      // Call the new Edge Function
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: newUser.email,
          password: newUser.password,
          role: newUser.role,
          name: newUser.name,
          // admin_id: adminUser.id, // The Edge Function will use the authenticated user context or you can pass it if needed for its internal logic
        },
      });

      if (error) throw error;
      // Assuming the edge function returns { success: true } or throws error
      // Or if it returns the new user data, you could use it.

      toast({
        title: 'Success',
        description: 'User created successfully. Refreshing list...',
      });
      await fetchUsers(); // Refresh users list
      setIsModalOpen(false);
      setNewUser({ email: '', name: '', role: 'cashier', password: '' });
    } catch (error) {
      console.error('Error creating user:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create user';
      toast({
        title: 'Error Creating User',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleUserStatus = async (targetUserId: string, currentStatus: boolean) => {
    if (!adminUser) return;
    setIsProcessing(true); // You might want a specific loading state for the row/button
    try {
      // Call the new Edge Function
      const { data, error } = await supabase.functions.invoke('admin-toggle-user-status', {
        body: {
          target_user_id: targetUserId,
          // admin_id: adminUser.id, // Edge function uses authenticated caller context
        },
      });

      if (error) throw error;

      // Optimistically update or refetch
      setUsers(currentUsers =>
        currentUsers.map(u =>
          u.id === targetUserId ? { ...u, active: !u.active } : u
        )
      );
      // Or await fetchUsers();

      toast({
        title: 'Success',
        description: `User status ${currentStatus ? 'deactivated' : 'activated'} successfully.`,
      });
    } catch (error) {
      console.error('Error toggling user status:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update user status';
      toast({
        title: 'Error Toggling Status',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      u.email.toLowerCase().includes(searchLower) ||
      (u.name?.toLowerCase() || '').includes(searchLower);
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Users</h1>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Create a new user account. Password must meet complexity requirements.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Email Input */}
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">Email</label>
                <Input
                  id="email"
                  value={newUser.email}
                  onChange={e => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                  type="email"
                  placeholder="user@example.com"
                  disabled={isProcessing}
                />
              </div>
              {/* Name Input */}
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">Name</label>
                <Input
                  id="name"
                  value={newUser.name}
                  onChange={e => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="John Doe"
                  disabled={isProcessing}
                />
              </div>
              {/* Role Select */}
              <div className="space-y-2">
                <label htmlFor="role" className="text-sm font-medium">Role</label>
                <Select
                  value={newUser.role}
                  onValueChange={(value: string) => setNewUser(prev => ({ ...prev, role: value as UserRole }))}
                  disabled={isProcessing}
                >
                  <SelectTrigger id="role"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cashier">Cashier</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    {/* Only show Super Admin if the current adminUser is a Super Admin */}
                    {adminUser?.role === 'superadmin' && (
                      <SelectItem value="superadmin">Super Admin</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              {/* Password Input */}
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">Password</label>
                <Input
                  id="password"
                  value={newUser.password}
                  onChange={e => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                  type="password"
                  placeholder="••••••••"
                  disabled={isProcessing}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isProcessing}>
                Cancel
              </Button>
              <Button onClick={handleAddUser} disabled={isProcessing}>
                {isProcessing ? <LoadingSpinner size="sm" className="mr-2" /> : null}
                Create User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter UI - Remains the same */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by email or name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="cashier">Cashier</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="superadmin">Super Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users List - Modified toggle button */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="p-4"><Skeleton className="h-10 w-full" /></Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredUsers.map(u => (
            <Card key={u.id} className="p-4">
              <CardContent className="p-0">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="flex-grow">
                    <h3 className="text-lg font-semibold">
                      {u.name || u.email}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {u.email}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="outline" className="capitalize">
                        <UserCog className="w-3 h-3 mr-1" />
                        {u.role}
                      </Badge>
                      <Badge
                        variant={u.active ? 'default' : 'secondary'}
                        className={u.active ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}
                      >
                        <Power className="w-3 h-3 mr-1" />
                        {u.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    {u.last_login_at && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Last login: {formatDateTime(u.last_login_at)}
                      </p>
                    )}
                     {u.created_at && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Created: {formatDateTime(u.created_at)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2 sm:mt-0 self-start sm:self-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleUserStatus(u.id, u.active)}
                      disabled={isProcessing || u.id === adminUser?.id} // Prevent admin from deactivating themselves
                    >
                      {u.active ? 'Deactivate' : 'Activate'}
                    </Button>
                    {/* Add Edit button/dialog here if needed */}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredUsers.length === 0 && !isLoading && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No users found matching your criteria.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UsersPage;