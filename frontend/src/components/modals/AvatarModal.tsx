import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useUpdateAvatar } from '@/hooks/useData';
import { useAuth } from '@/hooks/useAuth';
import { useUi } from '@/hooks/useUi';
import { initials } from '@/lib/format';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/primitives';

/** Read a File, downscale to <=320px, return a JPEG data URI. */
function resizeToDataUri(file: File, max = 320): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Não consegui ler o arquivo.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Arquivo não parece ser uma imagem.'));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas indisponível.'));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function AvatarModal() {
  const open = useUi((s) => s.modal === 'avatar');
  const close = useUi((s) => s.close);
  const { user } = useAuth();
  const update = useUpdateAvatar();
  const fileRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setPreview(user?.avatarUrl ?? null);
      setBusy(false);
    }
  }, [open, user?.avatarUrl]);

  async function onPick(file?: File) {
    if (!file) return;
    if (file.size > 12 * 1024 * 1024) {
      toast.error('Imagem muito grande (máx. 12 MB).');
      return;
    }
    setBusy(true);
    try {
      setPreview(await resizeToDataUri(file));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao processar a imagem.');
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    try {
      await update.mutateAsync(preview);
      close();
    } catch {
      /* toast handled in the mutation */
    }
  }

  async function removePhoto() {
    try {
      await update.mutateAsync(null);
      close();
    } catch {
      /* toast handled in the mutation */
    }
  }

  const changed = (preview ?? null) !== (user?.avatarUrl ?? null);

  return (
    <Modal
      open={open}
      onClose={close}
      title="Foto de perfil"
      footer={
        <div className="flex gap-2">
          {user?.avatarUrl ? (
            <Button variant="danger" onClick={removePhoto} loading={update.isLoading}>
              Remover
            </Button>
          ) : (
            <Button variant="ghost" onClick={close} block>
              Cancelar
            </Button>
          )}
          <Button onClick={save} loading={update.isLoading} disabled={!changed || busy} block>
            Salvar
          </Button>
        </div>
      }
    >
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-surface-2 text-[28px] font-semibold text-text-dim">
          {preview ? (
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            initials(user?.name)
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onPick(e.target.files?.[0])}
        />
        <Button variant="secondary" onClick={() => fileRef.current?.click()} loading={busy}>
          {preview ? 'Trocar foto' : 'Escolher foto'}
        </Button>
        <p className="text-center text-[12px] text-text-mute">
          A imagem é reduzida no seu aparelho antes de enviar. Sem foto, aparece a inicial do seu nome.
        </p>
      </div>
    </Modal>
  );
}
