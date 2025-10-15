import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Clock, LogIn, UserPlus } from "lucide-react";
import { z } from "zod";

const authSchema = z.object({
  email: z.string().trim().email({ message: "Nieprawidłowy adres email" }),
  password: z.string().min(6, { message: "Hasło musi mieć minimum 6 znaków" }),
});

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate input
    const result = authSchema.safeParse({ email, password });
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast.error("Nieprawidłowy email lub hasło");
          } else {
            toast.error("Błąd logowania: " + error.message);
          }
        } else {
          toast.success("Zalogowano pomyślnie!");
        }
      } else {
        const redirectUrl = `${window.location.origin}/`;
        
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
          },
        });

        if (error) {
          if (error.message.includes("already registered")) {
            toast.error("Ten email jest już zarejestrowany");
          } else {
            toast.error("Błąd rejestracji: " + error.message);
          }
        } else {
          toast.success("Konto utworzone! Możesz się teraz zalogować.");
        }
      }
    } catch (error: any) {
      toast.error("Wystąpił błąd: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 gradient-card glow-primary">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Clock className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-bold gradient-primary bg-clip-text text-transparent">
            WorkTime Tracker
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="twoj@email.pl"
              className="bg-background/50"
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="password">Hasło</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              className="bg-background/50"
              disabled={loading}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full gradient-primary"
            disabled={loading}
          >
            {loading ? (
              "Proszę czekać..."
            ) : isLogin ? (
              <>
                <LogIn className="w-4 h-4 mr-2" />
                Zaloguj się
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" />
                Zarejestruj się
              </>
            )}
          </Button>

          <div className="text-center">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsLogin(!isLogin)}
              disabled={loading}
            >
              {isLogin ? "Nie masz konta? Zarejestruj się" : "Masz już konto? Zaloguj się"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default Auth;
