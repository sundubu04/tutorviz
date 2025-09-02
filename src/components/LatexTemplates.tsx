import React, { useState } from 'react';
import { ChevronDown, ChevronRight, FileText, BookOpen, Calculator, Image, Table } from 'lucide-react';

interface LatexTemplatesProps {
  onSelectTemplate: (template: string) => void;
  className?: string;
}

interface Template {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  content: string;
}

const templates: Template[] = [
  {
    id: 'article',
    name: 'Article',
    description: 'Standard academic article format',
    icon: <FileText className="h-4 w-4" />,
    content: `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{graphicx}
\\usepackage{geometry}

\\geometry{margin=1in}

\\title{Your Title Here}
\\author{Your Name}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{Introduction}
Your introduction goes here.

\\section{Main Content}
Your main content goes here.

\\section{Conclusion}
Your conclusion goes here.

\\end{document}`
  },
  {
    id: 'book',
    name: 'Book/Report',
    description: 'Multi-chapter document format',
    icon: <BookOpen className="h-4 w-4" />,
    content: `\\documentclass{book}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{graphicx}
\\usepackage{geometry}

\\geometry{margin=1in}

\\title{Your Book Title}
\\author{Your Name}
\\date{\\today}

\\begin{document}

\\frontmatter
\\maketitle
\\tableofcontents

\\mainmatter
\\chapter{Introduction}
Your introduction goes here.

\\chapter{First Chapter}
Your first chapter content goes here.

\\chapter{Conclusion}
Your conclusion goes here.

\\end{document}`
  },
  {
    id: 'math',
    name: 'Math Document',
    description: 'Document with mathematical content',
    icon: <Calculator className="h-4 w-4" />,
    content: `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{graphicx}
\\usepackage{geometry}

\\geometry{margin=1in}

\\title{Mathematical Document}
\\author{Your Name}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{Introduction}
This document demonstrates various mathematical expressions.

\\section{Mathematical Examples}

\\subsection{Inline Math}
Here is an inline equation: $E = mc^2$.

\\subsection{Display Math}
Here is a displayed equation:
\\begin{equation}
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
\\end{equation}

\\subsection{Matrix}
Here is a matrix:
\\begin{equation}
A = \\begin{pmatrix}
a & b \\\\
c & d
\\end{pmatrix}
\\end{equation}

\\end{document}`
  },
  {
    id: 'presentation',
    name: 'Presentation',
    description: 'Beamer presentation format',
    icon: <Image className="h-4 w-4" />,
    content: `\\documentclass{beamer}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage{amssymb}

\\title{Your Presentation Title}
\\author{Your Name}
\\date{\\today}

\\begin{document}

\\frame{\\titlepage}

\\begin{frame}
\\frametitle{First Slide}
\\begin{itemize}
\\item First point
\\item Second point
\\item Third point
\\end{itemize}
\\end{frame}

\\begin{frame}
\\frametitle{Second Slide}
Your content goes here.
\\end{frame}

\\end{document}`
  },
  {
    id: 'table',
    name: 'Table Document',
    description: 'Document with tables and data',
    icon: <Table className="h-4 w-4" />,
    content: `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{graphicx}
\\usepackage{booktabs}
\\usepackage{geometry}

\\geometry{margin=1in}

\\title{Document with Tables}
\\author{Your Name}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{Introduction}
This document demonstrates table formatting.

\\section{Data Tables}

\\begin{table}[h]
\\centering
\\begin{tabular}{lcc}
\\toprule
Name & Age & Score \\\\
\\midrule
Alice & 25 & 95 \\\\
Bob & 30 & 87 \\\\
Charlie & 28 & 92 \\\\
\\bottomrule
\\end{tabular}
\\caption{Sample Data Table}
\\label{tab:sample}
\\end{table}

\\end{document}`
  }
];

const snippets = [
  {
    name: 'Math Equation',
    content: '\\begin{equation}\nE = mc^2\n\\end{equation}'
  },
  {
    name: 'Inline Math',
    content: '$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$'
  },
  {
    name: 'Bold Text',
    content: '\\textbf{Bold text}'
  },
  {
    name: 'Italic Text',
    content: '\\textit{Italic text}'
  },
  {
    name: 'List',
    content: '\\begin{itemize}\n\\item First item\n\\item Second item\n\\end{itemize}'
  },
  {
    name: 'Numbered List',
    content: '\\begin{enumerate}\n\\item First item\n\\item Second item\n\\end{enumerate}'
  },
  {
    name: 'Table',
    content: '\\begin{tabular}{|c|c|}\n\\hline\nHeader 1 & Header 2 \\\\\n\\hline\nData 1 & Data 2 \\\\\n\\hline\n\\end{tabular}'
  },
  {
    name: 'Image',
    content: '\\includegraphics[width=0.5\\textwidth]{image.png}'
  }
];

export default function LatexTemplates({ onSelectTemplate, className = "" }: LatexTemplatesProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState<'templates' | 'snippets'>('templates');

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">LaTeX Templates & Snippets</h3>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          </button>
        </div>

        {isExpanded && (
          <>
            {/* Section Tabs */}
            <div className="flex space-x-1 mb-4 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveSection('templates')}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeSection === 'templates'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Templates
              </button>
              <button
                onClick={() => setActiveSection('snippets')}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeSection === 'snippets'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Snippets
              </button>
            </div>

            {/* Templates Section */}
            {activeSection === 'templates' && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">Choose a template to get started:</p>
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => onSelectTemplate(template.content)}
                    className="w-full p-3 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors group"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="text-blue-600 group-hover:text-blue-700">
                        {template.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 group-hover:text-blue-900">
                          {template.name}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1">
                          {template.description}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Snippets Section */}
            {activeSection === 'snippets' && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">Common LaTeX snippets:</p>
                <div className="grid grid-cols-1 gap-2">
                  {snippets.map((snippet, index) => (
                    <button
                      key={index}
                      onClick={() => onSelectTemplate(snippet.content)}
                      className="p-2 text-left border border-gray-200 rounded hover:border-blue-300 hover:bg-blue-50 transition-colors group"
                    >
                      <div className="text-sm font-medium text-gray-900 group-hover:text-blue-900">
                        {snippet.name}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 font-mono">
                        {snippet.content.length > 50 
                          ? snippet.content.substring(0, 50) + '...'
                          : snippet.content
                        }
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
