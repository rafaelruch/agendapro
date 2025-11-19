import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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
  const form = useForm<UserFormData>({
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

  useEffect(() => {
    if (open) {
      form.reset({
        username: user?.username || "",
        name: user?.name || "",
        email: user?.email || "",
        role: (user?.role as "user" | "admin") || "user",
        active: user?.active ?? true,
        password: "",
      });
    }
  }, [open, user, form]);

  const handleSubmit = (data: UserFormData) => {
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

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 px-6 pb-6 sm:px-9.5 sm:pb-9.5">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Usuário</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="usuario"
                      disabled={!!user}
                      data-testid="input-username"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="João da Silva"
                      data-testid="input-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      placeholder="usuario@email.com"
                      data-testid="input-email"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {user ? "Nova Senha (opcional)" : "Senha"}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      placeholder="••••••••"
                      data-testid="input-password"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Permissão</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-role">
                        <SelectValue placeholder="Selecione a permissão" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="user">
                        Usuário - Acesso básico
                      </SelectItem>
                      <SelectItem value="admin">
                        Administrador - Acesso total
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
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
      </Form>
    </Modal>
  );
}
