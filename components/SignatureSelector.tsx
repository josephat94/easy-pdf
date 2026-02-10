"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

const AVAILABLE_SIGNATURES = [
  { name: "Brian", path: "/signs/Brian.png" },
  { name: "Daren", path: "/signs/Daren.png" },
  { name: "Steven", path: "/signs/Steven.png" },
  { name: "Tristan", path: "/signs/Tristan.png" },
  { name: "William", path: "/signs/William.png" },
  { name: "Amy", path: "/signs/Amy.png" },
];

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (imagePath: string) => void;
};

export function SignatureSelector({ isOpen, onClose, onSelect }: Props) {
  const handleSelect = (path: string) => {
    onSelect(path);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle>Seleccionar Firma</CardTitle>
                <CardDescription>
                  Elige una firma para agregar al PDF. Haz clic en el PDF para
                  colocarla.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {AVAILABLE_SIGNATURES.map((signature) => (
                    <motion.button
                      key={signature.path}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSelect(signature.path)}
                      className="relative group rounded-lg border-2 border-slate-200 hover:border-blue-500 transition-colors overflow-hidden bg-white"
                    >
                      <div className="aspect-video flex items-center justify-center p-4">
                        <img
                          src={signature.path}
                          alt={signature.name}
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                      <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/10 transition-colors" />
                      <div className="p-2 text-center">
                        <p className="text-sm font-medium text-slate-700">
                          {signature.name}
                        </p>
                      </div>
                    </motion.button>
                  ))}
                </div>
                <div className="mt-4 flex justify-end">
                  <Button variant="outline" onClick={onClose}>
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
