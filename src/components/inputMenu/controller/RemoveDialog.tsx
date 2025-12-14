import { useRef } from "react"
import { Trash2 } from "lucide-react"
import { useContainer } from "@/hooks/useContainer"
import { i18n } from "#imports"

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
import { stopPropagation } from "@/utils/dom"

type RemoveDialogProps = {
  open: boolean
  title: string
  description: string
  onOpenChange: (open: boolean) => void
  onRemove: () => void
  children: React.ReactNode
  portal?: boolean
}

export const RemoveDialog = (props: RemoveDialogProps) => {
  const { container } = useContainer()
  const closeRef = useRef<HTMLButtonElement>(null)
  const handleOpenAutoFocus = (e: Event) => {
    closeRef.current?.focus()
    e.preventDefault()
  }
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent
        onOpenAutoFocus={handleOpenAutoFocus}
        className="w-auto"
        container={container}
        {...stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
          <DialogDescription>{props.description}</DialogDescription>
        </DialogHeader>
        {props.children}
        <DialogFooter className="mt-2">
          <DialogClose asChild>
            <Button type="button" variant="secondary" size="lg">
              {i18n.t("common.cancel")}
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
              {i18n.t("common.delete")}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
