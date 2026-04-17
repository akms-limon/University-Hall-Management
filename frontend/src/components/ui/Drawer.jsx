import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";

function Drawer({ open, onClose, side = "left", children, widthClass = "w-72" }) {
  const startX = side === "right" ? "100%" : "-100%";
  const sideClass = side === "right" ? "right-0" : "left-0";

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div className="fixed inset-0 z-50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-label="Close drawer"
          />

          <motion.div
            className={`absolute top-0 ${sideClass} h-full ${widthClass} overflow-hidden shadow-[0_18px_40px_rgba(2,6,23,0.5)]`}
            initial={{ x: startX }}
            animate={{ x: 0 }}
            exit={{ x: startX }}
            transition={{ type: "tween", duration: 0.2 }}
          >
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default Drawer;
