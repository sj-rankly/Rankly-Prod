"use client";

import React, { useCallback, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { 
  Bold, 
  Italic, 
  Strikethrough, 
  List, 
  ListOrdered, 
  Heading1, 
  Heading2, 
  Heading3, 
  Undo, 
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Quote,
  Code,
  MoreHorizontal,
  Type
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface WYSIWYGEditorProps {
  content: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  editable?: boolean;
  className?: string;
}

const TEXT_COLORS = [
  { name: 'Default', value: 'currentColor' },
  { name: 'Black', value: '#000000' },
  { name: 'Gray', value: '#6B7280' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Yellow', value: '#EAB308' },
  { name: 'Green', value: '#22C55E' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Purple', value: '#A855F7' },
  { name: 'Pink', value: '#EC4899' },
];

export function WYSIWYGEditor({
  content,
  onChange,
  placeholder = "Start typing...",
  editable = true,
  className,
}: WYSIWYGEditorProps) {
  const [colorMenuOpen, setColorMenuOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
      }),
      Color,
      TextStyle,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getHTML());
      }
    },
    editorProps: {
      attributes: {
        class: "prose prose-zinc dark:prose-invert max-w-none focus:outline-none min-h-[300px] px-4 py-3",
      },
    },
  });

  React.useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  const toggleBold = useCallback(() => {
    editor?.chain().focus().toggleBold().run();
  }, [editor]);

  const toggleItalic = useCallback(() => {
    editor?.chain().focus().toggleItalic().run();
  }, [editor]);

  const toggleStrike = useCallback(() => {
    editor?.chain().focus().toggleStrike().run();
  }, [editor]);

  const toggleBulletList = useCallback(() => {
    editor?.chain().focus().toggleBulletList().run();
  }, [editor]);

  const toggleOrderedList = useCallback(() => {
    editor?.chain().focus().toggleOrderedList().run();
  }, [editor]);

  const setHeading = useCallback((level: 1 | 2 | 3) => {
    editor?.chain().focus().toggleHeading({ level }).run();
  }, [editor]);

  const setTextAlign = useCallback((alignment: 'left' | 'center' | 'right' | 'justify') => {
    editor?.chain().focus().setTextAlign(alignment).run();
  }, [editor]);

  const setColor = useCallback((color: string) => {
    if (color === 'currentColor') {
      editor?.chain().focus().unsetColor().run();
    } else {
      editor?.chain().focus().setColor(color).run();
    }
    setColorMenuOpen(false);
  }, [editor]);

  const toggleBlockquote = useCallback(() => {
    editor?.chain().focus().toggleBlockquote().run();
  }, [editor]);

  const toggleCodeBlock = useCallback(() => {
    editor?.chain().focus().toggleCodeBlock().run();
  }, [editor]);

  const undo = useCallback(() => {
    editor?.chain().focus().undo().run();
  }, [editor]);

  const redo = useCallback(() => {
    editor?.chain().focus().redo().run();
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className={cn("border rounded-lg bg-background flex flex-col", className)}>
      {/* ✅ MAIN TOOLBAR - Like Profound's toolbar */}
      {editable && (
        <div className="flex items-center gap-1 p-2 border-b bg-muted/30 flex-wrap">
          {/* Undo/Redo */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={undo}
            disabled={!editor.can().undo()}
            className="h-8 w-8 p-0 hover:bg-accent transition-all"
            title="Undo"
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={redo}
            disabled={!editor.can().redo()}
            className="h-8 w-8 p-0 hover:bg-accent transition-all"
            title="Redo"
          >
            <Redo className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-border mx-1" />

          {/* Text Formatting */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleBold}
            className={cn(
              "h-8 w-8 p-0 hover:bg-accent transition-all",
              editor.isActive("bold") && "bg-accent"
            )}
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleItalic}
            className={cn(
              "h-8 w-8 p-0 hover:bg-accent transition-all",
              editor.isActive("italic") && "bg-accent"
            )}
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleStrike}
            className={cn(
              "h-8 w-8 p-0 hover:bg-accent transition-all",
              editor.isActive("strike") && "bg-accent"
            )}
            title="Strikethrough"
          >
            <Strikethrough className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-border mx-1" />

          {/* Headings */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setHeading(1)}
            className={cn(
              "h-8 w-8 p-0 hover:bg-accent transition-all",
              editor.isActive("heading", { level: 1 }) && "bg-accent"
            )}
            title="Heading 1"
          >
            <Heading1 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setHeading(2)}
            className={cn(
              "h-8 w-8 p-0 hover:bg-accent transition-all",
              editor.isActive("heading", { level: 2 }) && "bg-accent"
            )}
            title="Heading 2"
          >
            <Heading2 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setHeading(3)}
            className={cn(
              "h-8 w-8 p-0 hover:bg-accent transition-all",
              editor.isActive("heading", { level: 3 }) && "bg-accent"
            )}
            title="Heading 3"
          >
            <Heading3 className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-border mx-1" />

          {/* Lists */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleBulletList}
            className={cn(
              "h-8 w-8 p-0 hover:bg-accent transition-all",
              editor.isActive("bulletList") && "bg-accent"
            )}
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleOrderedList}
            className={cn(
              "h-8 w-8 p-0 hover:bg-accent transition-all",
              editor.isActive("orderedList") && "bg-accent"
            )}
            title="Numbered List"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-border mx-1" />

          {/* Text Alignment */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setTextAlign('left')}
            className={cn(
              "h-8 w-8 p-0 hover:bg-accent transition-all",
              editor.isActive({ textAlign: 'left' }) && "bg-accent"
            )}
            title="Align Left"
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setTextAlign('center')}
            className={cn(
              "h-8 w-8 p-0 hover:bg-accent transition-all",
              editor.isActive({ textAlign: 'center' }) && "bg-accent"
            )}
            title="Align Center"
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setTextAlign('right')}
            className={cn(
              "h-8 w-8 p-0 hover:bg-accent transition-all",
              editor.isActive({ textAlign: 'right' }) && "bg-accent"
            )}
            title="Align Right"
          >
            <AlignRight className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setTextAlign('justify')}
            className={cn(
              "h-8 w-8 p-0 hover:bg-accent transition-all",
              editor.isActive({ textAlign: 'justify' }) && "bg-accent"
            )}
            title="Justify"
          >
            <AlignJustify className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-border mx-1" />

          {/* Text Color Picker */}
          <DropdownMenu open={colorMenuOpen} onOpenChange={setColorMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-accent transition-all"
                title="Text Color"
              >
                <Type className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48">
              <div className="grid grid-cols-5 gap-1 p-2">
                {TEXT_COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setColor(color.value)}
                    className="h-8 w-8 rounded-md border hover:scale-110 transition-transform"
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="w-px h-6 bg-border mx-1" />

          {/* More Options (Overflow Menu) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-accent transition-all"
                title="More Options"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={toggleBlockquote}>
                <Quote className="h-4 w-4 mr-2" />
                Blockquote
              </DropdownMenuItem>
              <DropdownMenuItem onClick={toggleCodeBlock}>
                <Code className="h-4 w-4 mr-2" />
                Code Block
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Editor Content */}
      <div className="overflow-y-auto flex-1">
        <EditorContent editor={editor} className="min-h-[300px]" />
      </div>
    </div>
  );
}
