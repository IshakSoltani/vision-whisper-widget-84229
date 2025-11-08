import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const formSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name must be less than 100 characters"),
  claimId: z.string().trim().min(1, "Claim ID is required").max(50, "Claim ID must be less than 50 characters"),
});

export type UserInfo = z.infer<typeof formSchema>;

interface UserInfoFormProps {
  onSubmit: (data: UserInfo) => void;
}

const UserInfoForm = ({ onSubmit }: UserInfoFormProps) => {
  const form = useForm<UserInfo>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      claimId: "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base">Name</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Enter your name" 
                  autoComplete="name"
                  className="h-12 text-base"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="claimId"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base">Claim ID</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Enter your claim ID" 
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  inputMode="text"
                  className="h-12 text-base"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full h-12 text-base font-semibold">
          Continue to Image Upload
        </Button>
      </form>
    </Form>
  );
};

export default UserInfoForm;
