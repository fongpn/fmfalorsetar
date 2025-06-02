import { useState, useEffect } from 'react';
import { useAuth, adminRoles } from '@/lib/auth';
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
import type { User } from '@/types';

const UsersPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    name: '',
    role: 'cashier',
    password: '',
  });

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data, error } = await supabase.rpc('get_accessible_users', {
          admin_id: user!.id,
        });

        if (error) throw error;
        setUsers(data as User[]);
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

    fetchUsers();
  }, [user, toast]);

  const handleAddUser = async () => {
    try {
      const { error } = await supabase.rpc('create_user', {
        email: newUser.email,
        password: newUser.password,
        role: newUser.role,
        name: newUser.name,
        admin_id: user!.id,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'User created successfully',
      });

      // Refresh users list
      const { data, error: fetchError } = await supabase.rpc(
        'get_accessible_users',
        { admin_id: user!.id }
      );

      if (fetchError) throw fetchError;
      setUsers(data as User[]);

      setIsAddingUser(false);
      setNewUser({
        email: '',
        name: '',
        role: 'cashier',
        password: '',
      });
    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: 'Error',
        description: 'Failed to create user',
        variant: 'destructive',
      });
    }
  };

  const handleToggleUserStatus = async (userId: string) => {
    try {
      const { error } = await supabase.rpc('toggle_user_active_status', {
        user_id: userId,
        admin_id: user!.id,
      });

      if (error) throw error;

      // Update local state
      setUsers(currentUsers =>
        currentUsers.map(u =>
          u.id === userId ? { ...u, active: !u.active } : u
        )
      );

      toast({
        title: 'Success',
        description: 'User status updated successfully',
      });
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user status',
        variant: 'destructive',
      });
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.name?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Users</h1>
        <Dialog open={isAddingUser} onOpenChange={setIsAddingUser}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Create a new user account with specified permissions.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  value={newUser.email}
                  onChange={e =>
                    setNewUser(prev => ({ ...prev, email: e.target.value }))
                  }
                  type="email"
                  placeholder="user@example.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={newUser.name}
                  onChange={e =>
                    setNewUser(prev => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <Select
                  value={newUser.role}
                  onValueChange={value =>
                    setNewUser(prev => ({ ...prev, role: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cashier">Cashier</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    {user?.role === 'superadmin' && (
                      <SelectItem value="superadmin">Super Admin</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Password</label>
                <Input
                  value={newUser.password}
                  onChange={e =>
                    setNewUser(prev => ({ ...prev, password: e.target.value }))
                  }
                  type="password"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddingUser(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddUser}>Create User</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400" />
            <Input
              placeholder="Search by email or name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[180px]">
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

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-6 w-1/4 mb-2" />
              <Skeleton className="h-4 w-1/3" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredUsers.map(user => (
            <Card key={user.id} className="p-4">
              <CardContent className="p-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {user.name || user.email}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {user.email}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">
                        <UserCog className="w-3 h-3 mr-1" />
                        {user.role}
                      </Badge>
                      <Badge
                        variant={user.active ? 'default' : 'secondary'}
                      >
                        <Power className="w-3 h-3 mr-1" />
                        {user.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleUserStatus(user.id)}
                    >
                      {user.active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                </div>
                {user.last_login_at && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Last login: {formatDateTime(user.last_login_at)}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}

          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No users found
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UsersPage;