import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/layout/AppLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Loader2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles?: { full_name: string } | null;
}

interface CaseInfo {
  id: string;
  type_cancer: string;
  patients: { nom: string; prenom: string } | null;
}

export default function Discussion() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const caseId = searchParams.get('case');
  const [cases, setCases] = useState<CaseInfo[]>([]);
  const [selectedCase, setSelectedCase] = useState<string | null>(caseId);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCases();
  }, []);

  useEffect(() => {
    if (selectedCase) {
      fetchComments();
      // Realtime subscription
      const channel = supabase
        .channel(`comments-${selectedCase}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'case_comments', filter: `case_id=eq.${selectedCase}` },
          (payload) => {
            setComments((prev) => [...prev, payload.new as Comment]);
            setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 100);
          }
        )
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [selectedCase]);

  const fetchCases = async () => {
    const { data } = await supabase.from('cancer_cases').select('id, type_cancer, patients(nom, prenom)').order('created_at', { ascending: false });
    setCases((data as any) || []);
    if (!selectedCase && data && data.length > 0) setSelectedCase(data[0].id);
    setLoading(false);
  };

  const fetchComments = async () => {
    if (!selectedCase) return;
    const { data } = await supabase
      .from('case_comments')
      .select('id, content, created_at, user_id')
      .eq('case_id', selectedCase)
      .order('created_at', { ascending: true });
    setComments(data || []);
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }), 100);
  };

  const sendComment = async () => {
    if (!newComment.trim() || !selectedCase || !user) return;
    setSending(true);
    const { error } = await supabase.from('case_comments').insert({
      case_id: selectedCase,
      user_id: user.id,
      content: newComment.trim(),
    });
    if (error) toast.error('Erreur envoi');
    else setNewComment('');
    setSending(false);
  };

  if (loading) return (
    <AppLayout>
      <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={32} /></div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div className="space-y-4">
        <div>
          <h1 className="font-display text-xl md:text-2xl font-bold">Discussion RCP</h1>
          <p className="text-muted-foreground text-sm">Réunion de Concertation Pluridisciplinaire</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-220px)] lg:h-[calc(100vh-180px)]">
          {/* Case List */}
          <div className="stat-card overflow-y-auto lg:col-span-1 max-h-48 lg:max-h-none">
            <h3 className="font-display font-semibold mb-3 text-sm">Cas</h3>
            <div className="space-y-1">
              {cases.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun cas</p>
              ) : cases.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCase(c.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedCase === c.id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'}`}
                >
                  <p className="font-medium truncate">{c.patients?.nom} {c.patients?.prenom}</p>
                  <p className="text-xs text-muted-foreground">{c.type_cancer}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Chat */}
          <div className="stat-card flex flex-col lg:col-span-2 min-h-0">
            {selectedCase ? (
              <>
                <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 mb-3 min-h-0">
                  {comments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <MessageSquare size={32} className="mb-2" />
                      <p className="text-sm">Aucun commentaire</p>
                      <p className="text-xs">Commencez la discussion</p>
                    </div>
                  ) : comments.map((c) => (
                    <div key={c.id} className={`flex ${c.user_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-xl px-4 py-2 ${c.user_id === user?.id ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        <p className="text-sm">{c.content}</p>
                        <p className="text-[10px] opacity-60 mt-1">
                          {new Date(c.created_at).toLocaleTimeString('fr-DZ', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-2 border-t border-border">
                  <Input
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendComment()}
                    placeholder="Votre commentaire..."
                    className="flex-1"
                  />
                  <Button onClick={sendComment} disabled={sending} className="h-10 w-10 p-0" size="icon">
                    {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p className="text-sm">Sélectionnez un cas pour commencer</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
