'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, X, Loader2, Edit } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import type { QuickReply } from '@/types';

export function QuickReplyManager() {
  const supabase = createClient();
  const { user, accountId, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [replies, setReplies] = useState<QuickReply[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  const [editingReply, setEditingReply] = useState<QuickReply | null>(null);
  const [replyToDelete, setReplyToDelete] = useState<QuickReply | null>(null);
  
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  const [shortcut, setShortcut] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!accountId) {
      setLoading(false);
      return;
    }
    fetchReplies(accountId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, accountId]);

  async function fetchReplies(actId: string) {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('quick_replies')
        .select('*')
        .eq('account_id', actId)
        .order('shortcut', { ascending: true });

      if (error) throw error;
      setReplies(data || []);
    } catch (err) {
      console.error('Failed to fetch quick replies:', err);
      toast.error('Failed to load quick replies');
    } finally {
      setLoading(false);
    }
  }

  function openCreateDialog() {
    setEditingReply(null);
    setShortcut('');
    setContent('');
    setDialogOpen(true);
  }

  function openEditDialog(reply: QuickReply) {
    setEditingReply(reply);
    setShortcut(reply.shortcut);
    setContent(reply.content);
    setDialogOpen(true);
  }

  function confirmDelete(reply: QuickReply) {
    setReplyToDelete(reply);
    setDeleteDialogOpen(true);
  }

  async function handleSave() {
    const cleanShortcut = shortcut.trim().replace(/^\//, '').toLowerCase();
    const cleanContent = content.trim();

    if (!cleanShortcut) {
      toast.error('Shortcut is required');
      return;
    }
    if (!cleanContent) {
      toast.error('Content is required');
      return;
    }

    try {
      setSaving(true);
      if (!accountId) {
        toast.error('Not authenticated');
        return;
      }

      if (editingReply) {
        const { error } = await supabase
          .from('quick_replies')
          .update({
            shortcut: cleanShortcut,
            content: cleanContent,
          })
          .eq('id', editingReply.id);

        if (error) throw error;
        toast.success('Quick reply updated');
      } else {
        const { error } = await supabase
          .from('quick_replies')
          .insert({
            account_id: accountId,
            shortcut: cleanShortcut,
            content: cleanContent,
          });

        if (error) {
          if (error.code === '23505') {
             toast.error('A shortcut with this name already exists');
             return;
          }
          throw error;
        }
        toast.success('Quick reply created');
      }

      setDialogOpen(false);
      setShortcut('');
      setContent('');
      await fetchReplies(accountId);
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Failed to save quick reply');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!replyToDelete) return;

    try {
      setDeleting(true);
      const { error } = await supabase
        .from('quick_replies')
        .delete()
        .eq('id', replyToDelete.id);

      if (error) throw error;

      toast.success('Quick reply deleted');
      setReplies((prev) => prev.filter((r) => r.id !== replyToDelete.id));
      setDeleteDialogOpen(false);
      setReplyToDelete(null);
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Failed to delete quick reply');
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Quick Replies</h2>
          <p className="text-sm text-slate-400">Save frequent messages as shortcuts. Type '/' in chat to use them.</p>
        </div>
        <Button
          onClick={openCreateDialog}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Plus className="size-4" />
          New Reply
        </Button>
      </div>

      {replies.length === 0 ? (
        <Card className="bg-slate-900 border-slate-700 ring-0 ring-transparent">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-slate-400 text-sm">No quick replies yet.</p>
            <p className="text-slate-500 text-xs mt-1">Create shortcuts for your most common responses.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {replies.map((reply) => (
            <Card key={reply.id} className="bg-slate-900 border-slate-700 hover:border-slate-600 transition-colors">
              <CardContent className="p-4 flex flex-col h-full justify-between gap-3">
                <div>
                  <div className="flex items-start justify-between">
                    <span className="inline-block rounded bg-slate-800 px-2 py-1 text-xs font-mono text-primary border border-slate-700 mb-2">
                      /{reply.shortcut}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 line-clamp-3 whitespace-pre-wrap">
                    {reply.content}
                  </p>
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                   <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-white" onClick={() => openEditDialog(reply)}>
                      <Edit className="size-4" />
                   </Button>
                   <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400 hover:text-red-300" onClick={() => confirmDelete(reply)}>
                      <X className="size-4" />
                   </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingReply ? 'Edit Quick Reply' : 'New Quick Reply'}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Create a shortcut for a frequently used message.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-slate-300">Shortcut</Label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 font-mono">/</span>
                <Input
                  placeholder="e.g. pricing"
                  value={shortcut}
                  onChange={(e) => setShortcut(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-600 pl-7 font-mono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Message Content</Label>
              <Textarea
                placeholder="The full message that will be sent..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[120px] bg-slate-800 border-slate-700 text-white placeholder:text-slate-600 resize-none"
              />
            </div>
          </div>

          <DialogFooter className="bg-slate-900 border-slate-700">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Quick Reply</DialogTitle>
            <DialogDescription className="text-slate-400">
              Are you sure you want to delete the shortcut &quot;/{replyToDelete?.shortcut}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="bg-slate-900 border-slate-700">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
