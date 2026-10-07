import { Link } from "react-router";
import { motion } from "framer-motion";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="flex min-h-screen flex-col bg-background text-foreground"
    >
      <header className="border-b border-border/70">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center px-5">
          <Brand />
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-5 text-center">
        <p className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground">
          Error 404
        </p>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
          Page Not Found
        </h1>
        <div className="mt-5 h-px w-14 bg-border" />
        <p className="mt-5 max-w-md text-sm leading-relaxed text-muted-foreground">
          The page you are looking for does not exist on the election portal.
        </p>
        <Button asChild className="mt-7">
          <Link to="/">Go to the election page</Link>
        </Button>
      </div>
    </motion.main>
  );
}
