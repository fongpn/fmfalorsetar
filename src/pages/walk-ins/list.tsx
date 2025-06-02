import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePagination } from '@/lib/hooks/usePagination';
import { formatDateTime, formatCurrency } from '@/lib/utils';
import type { WalkIn } from '@/types';

const WalkInsListPage = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [walkIns, setWalkIns] = useState<WalkIn[]>([]);

  const {
    paginatedData,
    currentPage,
    totalPages,
    nextPage,
    prevPage,
    goToPage,
    pageNumbers,
  } = usePagination({
    data: walkIns,
    itemsPerPage: 10,
  });

  useEffect(() => {
    const fetchWalkIns = async () => {
      try {
        const { data, error } = await supabase
          .from('walk_ins')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setWalkIns(data as WalkIn[]);
      } catch (error) {
        console.error('Error fetching walk-ins:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWalkIns();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Walk-Ins</h1>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          New Walk-In
        </Button>
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
          {paginatedData.map((walkIn) => (
            <Card key={walkIn.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">
                    {walkIn.name || 'Anonymous'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDateTime(walkIn.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {walkIn.age_group === 'adult' ? 'Adult' : 'Youth'}
                  </Badge>
                  <Badge variant="outline">
                    {formatCurrency(walkIn.amount)}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}

          {paginatedData.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No walk-ins found
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={prevPage}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              
              {pageNumbers.map((number) => (
                <Button
                  key={number}
                  variant={currentPage === number ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => goToPage(number)}
                >
                  {number}
                </Button>
              ))}
              
              <Button
                variant="outline"
                size="sm"
                onClick={nextPage}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WalkInsListPage;