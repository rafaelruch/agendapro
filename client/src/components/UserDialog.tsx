import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { User } from "@shared/schema";

const userFormSchema = z.object({
  username: z.string().min(3, "Usuário deve ter no mínimo 3 caracteres"),
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Senha é obrigatória").optional().or(z.literal("")),
  role: z.enum(["user", "admin"]),
  active: z.boolean(),
});

type UserFormData = z.infer<typeof userFormSchema>;

interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: UserFormData) => void;
  user?: Omit<User, 'password'> | null;
  isPending?: boolean;
}

export function UserDialog({
  open,
  onOpenChange,
  onSubmit,
  user,
  isPending = false,
}: UserDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: "",
      name: "",
      email: "",
      role: "user",
      active: true,
      password: "",
    },
  });

  const roleValue = watch("role");

  useEffect(() => {
    if (open) {
      reset({
        username: user?.username || "",
        name: user?.name || "",
        email: user?.email || "",
        role: (user?.role as "user" | "admin") || "user",
        active: user?.active ?? true,
        password: "",
      });
    }
  }, [open, user, reset]);

  const onFormSubmit = (data: UserFormData) => {
    const submitData = { ...data };
    if (!submitData.password) {
      delete submitData.password;
    }
    onSubmit(submitData);
  };

  return (
    <Modal isOpen={open} onClose={() => onOpenChange(false)}>
      <div className="px-6 pt-6 pb-4 sm:px-9.5 sm:pt-9.5 sm:pb-6">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-white" data-testid="text-dialog-title">
          {user ? "Editar Usuário" : "Novo Usuário"}
        </h3>
        <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
          {user
            ? "Atualize as informações do usuário"
            : "Adicione um novo usuário ao sistema"}
        </p>
      </div>

      <form onSubmit={handleSubmit(onFormSubmit)}>
        <div className="grid gap-4 px-6 pb-6 sm:px-9.5 sm:pb-9.5">
          <div className="grid gap-2">
            <Label htmlFor="username">Usuário</Label>
            <Input
              id="username"
              {...register("username") as any}
              placeholder="usuario"
              disabled={!!user}
              data-testid="input-username"
            />
            {errors.username && (
              <p className="text-sm text-error-600 dark:text-error-400">
                {errors.username.message}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="name">Nome Completo</Label>
            <Input
              id="name"
              {...register("name") as any}
              placeholder="João da Silva"
              data-testid="input-name"
            />
            {errors.name && (
              <p className="text-sm text-error-600 dark:text-error-400">
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              {...register("email") as any}
              placeholder="usuario@email.com"
              data-testid="input-email"
            />
            {errors.email && (
              <p className="text-sm text-error-600 dark:text-error-400">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password">
              {user ? "Nova Senha (opcional)" : "Senha"}
            </Label>
            <Input
              id="password"
              type="password"
              {...register("password") as any}
              placeholder="••••••••"
              data-testid="input-password"
            />
            {errors.password && (
              <p className="text-sm text-error-600 dark:text-error-400">
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="role">Permissão</Label>
            <Select
              value={roleValue}
              onValueChange={(value) => setValue("role", value as "user" | "admin")}
            >
              <SelectTrigger id="role" data-testid="select-role">
                <SelectValue placeholder="Selecione a permissão" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Usuário - Acesso básico</SelectItem>
                <SelectItem value="admin">Administrador - Acesso total</SelectItem>
              </SelectContent>
            </Select>
            {errors.role && (
              <p className="text-sm text-error-600 dark:text-error-400">
                {errors.role.message}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 pb-6 sm:px-9.5 sm:pb-9.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            data-testid="button-cancel"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            data-testid="button-submit"
          >
            {isPending ? "Salvando..." : user ? "Atualizar" : "Criar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
