"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  createR2AccountAction,
  createR2BucketAction,
  deleteR2AccountAction,
  deleteR2BucketAction,
  updateR2BucketAction,
  syncR2BucketAction,
} from "@/app/admin/actions";
import { Trash } from "@phosphor-icons/react";
import type { R2Account, R2Bucket } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { RippleButton, RippleButtonRipples } from "@/components/animate-ui/components/buttons/ripple";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormSelect } from "@/components/admin/form-select";

export function AccountDialogForm() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const res = await createR2AccountAction({}, formData);
    if (res?.error) {
      setError(res.error);
      setPending(false);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-full">Add account</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add R2 account</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <FieldGroup>
            {error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            <Field>
              <FieldLabel>Name</FieldLabel>
              <Input name="name" placeholder="e.g. Primary account" required />
            </Field>
            <Field>
              <FieldLabel>Account ID</FieldLabel>
              <Input name="accountId" placeholder="Cloudflare account ID" required />
            </Field>
            <Field>
              <FieldLabel>Access Key ID</FieldLabel>
              <Input name="accessKeyId" placeholder="R2 API token access key" required />
            </Field>
            <Field>
              <FieldLabel>Secret Access Key</FieldLabel>
              <Input
                name="secretAccessKey"
                placeholder="R2 API token secret"
                required
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <RippleButton type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save account"}
              <RippleButtonRipples />
            </RippleButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AddBucketDialog({
  accounts,
}: {
  accounts: { value: string; label: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const res = await createR2BucketAction({}, formData);
    if (res?.error) {
      setError(res.error);
      setPending(false);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-full">
          Add bucket
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add R2 bucket</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <FieldGroup>
            {error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            <Field>
              <FieldLabel>Account</FieldLabel>
              <FormSelect name="accountId" items={accounts} placeholder="Select account" required />
            </Field>
            <Field>
              <FieldLabel>Bucket name</FieldLabel>
              <Input
                name="name"
                placeholder="e.g. luminaq-images"
                required
              />
            </Field>
            <Field>
              <FieldLabel>Public URL (custom domain)</FieldLabel>
              <Input
                name="publicUrl"
                placeholder="https://images.example.com"
              />
            </Field>
            <Field>
              <FieldLabel>Quota (GB)</FieldLabel>
              <Input name="quotaBytes" type="number" defaultValue="10" min="1" />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <RippleButton type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save bucket"}
              <RippleButtonRipples />
            </RippleButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditBucketDialog({ bucket }: { bucket: R2Bucket }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("id", bucket.id);
    const res = await updateR2BucketAction({}, formData);
    if (res?.error) {
      setError(res.error);
      setPending(false);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit bucket</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <FieldGroup>
            {error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            <Field>
              <FieldLabel>Bucket name</FieldLabel>
              <Input name="name" defaultValue={bucket.name} required />
            </Field>
            <Field>
              <FieldLabel>Public URL (custom domain)</FieldLabel>
              <Input name="publicUrl" defaultValue={bucket.publicUrl ?? ""} />
            </Field>
            <Field>
              <FieldLabel>Quota (GB)</FieldLabel>
              <Input
                name="quotaBytes"
                type="number"
                defaultValue={Math.round((bucket.quotaBytes ?? 0) / (1024 * 1024 * 1024))}
                min="1"
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <RippleButton type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save changes"}
              <RippleButtonRipples />
            </RippleButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteBucketButton({ bucket }: { bucket: R2Bucket }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete bucket?</AlertDialogTitle>
          <AlertDialogDescription>
            &ldquo;{bucket.name}&rdquo; will be removed from Luminaq. The objects in Cloudflare
            R2 are not deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={async () => {
              await deleteR2BucketAction(bucket.id);
              setOpen(false);
              router.refresh();
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function DeleteAccountButton({ account }: { account: R2Account }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" aria-label={`Delete ${account.name}`}>
          <Trash />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete account?</AlertDialogTitle>
          <AlertDialogDescription>
            &ldquo;{account.name}&rdquo; and all its buckets will be removed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={async () => {
              await deleteR2AccountAction(account.id);
              setOpen(false);
              router.refresh();
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function SyncBucketButton({ bucket }: { bucket: R2Bucket }) {
  const router = useRouter();
  const [syncing, setSyncing] = React.useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-muted-foreground"
      disabled={syncing}
      onClick={async () => {
        setSyncing(true);
        await syncR2BucketAction(bucket.id);
        setSyncing(false);
        router.refresh();
      }}
    >
      {syncing ? "Syncing…" : "Sync usage"}
    </Button>
  );
}