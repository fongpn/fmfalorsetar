import { useState, useEffect } from 'react';
import { memberService, MemberWithStatus } from '../services/memberService';

export function useMembers() {
  const [members, setMembers] = useState<MemberWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await memberService.getAllMembers();
      setMembers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const searchMembers = async (query: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = query.trim() 
        ? await memberService.searchMembers(query)
        : await memberService.getAllMembers();
      setMembers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshMembers = () => {
    fetchMembers();
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  return {
    members,
    loading,
    error,
    searchMembers,
    refreshMembers
  };
}