"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Plus, Pencil, Trash2, MessageSquare } from "lucide-react"
import { CannedResponse } from "@/lib/types"

export default function CannedResponsesPage() {
  const [responses, setResponses] = useState<CannedResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingResponse, setEditingResponse] = useState<CannedResponse | null>(null)
  const [formData, setFormData] = useState({ shortcut: "", title: "", content: "" })
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: teamMember } = await supabase
      .from("team_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .single()

    if (teamMember) {
      setOrganizationId(teamMember.organization_id)
      
      const { data: cannedResponses } = await supabase
        .from("canned_responses")
        .select("*")
        .eq("organization_id", teamMember.organization_id)
        .order("created_at", { ascending: false })

      setResponses(cannedResponses || [])
    }
    setLoading(false)
  }

  async function handleSave() {
    if (!organizationId || !formData.shortcut || !formData.title || !formData.content) return

    if (editingResponse) {
      await supabase
        .from("canned_responses")
        .update({
          shortcut: formData.shortcut,
          title: formData.title,
          content: formData.content,
        })
        .eq("id", editingResponse.id)
    } else {
      await supabase
        .from("canned_responses")
        .insert({
          organization_id: organizationId,
          shortcut: formData.shortcut,
          title: formData.title,
          content: formData.content,
        })
    }

    setIsDialogOpen(false)
    setEditingResponse(null)
    setFormData({ shortcut: "", title: "", content: "" })
    loadData()
  }

  async function handleDelete(id: string) {
    await supabase.from("canned_responses").delete().eq("id", id)
    loadData()
  }

  function openEditDialog(response: CannedResponse) {
    setEditingResponse(response)
    setFormData({
      shortcut: response.shortcut,
      title: response.title,
      content: response.content,
    })
    setIsDialogOpen(true)
  }

  function openNewDialog() {
    setEditingResponse(null)
    setFormData({ shortcut: "", title: "", content: "" })
    setIsDialogOpen(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 min-h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Canned Responses</h1>
          <p className="text-muted-foreground">
            Create shortcuts for frequently used messages. Type /shortcut in the chat to use them.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add Response
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingResponse ? "Edit Response" : "New Canned Response"}</DialogTitle>
              <DialogDescription>
                Create a shortcut for a frequently used message.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="shortcut">Shortcut</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">/</span>
                  <Input
                    id="shortcut"
                    placeholder="greeting"
                    value={formData.shortcut}
                    onChange={(e) => setFormData({ ...formData, shortcut: e.target.value.toLowerCase().replace(/\s/g, "-") })}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Type /{formData.shortcut || "shortcut"} to use this response</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Friendly Greeting"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="content">Message Content</Label>
                <Textarea
                  id="content"
                  placeholder="Hello! Thanks for reaching out. How can I help you today?"
                  rows={4}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingResponse ? "Save Changes" : "Create Response"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {responses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No canned responses yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create shortcuts for messages you send frequently to save time.
            </p>
            <Button onClick={openNewDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Response
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Your Responses</CardTitle>
            <CardDescription>
              {responses.length} canned response{responses.length !== 1 ? "s" : ""} available
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Shortcut</TableHead>
                  <TableHead className="w-48">Title</TableHead>
                  <TableHead>Content</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {responses.map((response) => (
                  <TableRow key={response.id}>
                    <TableCell className="font-mono text-sm">/{response.shortcut}</TableCell>
                    <TableCell className="font-medium">{response.title}</TableCell>
                    <TableCell className="text-muted-foreground truncate max-w-md">
                      {response.content}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(response)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(response.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
