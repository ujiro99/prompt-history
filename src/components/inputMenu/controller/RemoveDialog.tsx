import { useRef } from "react"
import { Trash2 } from "lucide-react"

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

type RemoveDialogProps = {
  open: boolean
  description?: string
  onOpenChange: (open: boolean) => void
  onRemove: () => void
  children: React.ReactNode
  portal?: boolean
}

export const RemoveDialog = (props: RemoveDialogProps) => {
  const closeRef = useRef<HTMLButtonElement>(null)
  const handleOpenAutoFocus = (e: Event) => {
    closeRef.current?.focus()
    e.preventDefault()
  }
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent onOpenAutoFocus={handleOpenAutoFocus} className="w-auto">
        <DialogHeader>
          <DialogTitle>Remove Conofirm</DialogTitle>
        </DialogHeader>
        <DialogDescription>{props.description}</DialogDescription>
        <div className="py-1 flex items-center justify-center">
          {props.children}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary" size="lg">
              Cancel
            </Button>
          </DialogClose>
          <DialogClose asChild>
            <Button
              type="button"
              variant="destructive"
              size="lg"
              onClick={() => props.onRemove()}
              ref={closeRef}
            >
              <Trash2 />
              Remove
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
