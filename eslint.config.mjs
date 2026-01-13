import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [".next/**", "node_modules/**", "out/**", "build/**", "scripts/**"],
  },
  {
    rules: {
      // Disable unused vars check entirely (common in Next.js API routes)
      "@typescript-eslint/no-unused-vars": "off",
      // Allow any type
      "@typescript-eslint/no-explicit-any": "off",
      // Allow img element
      "@next/next/no-img-element": "off",
      // Allow missing deps in useEffect
      "react-hooks/exhaustive-deps": "off",
      // Allow unescaped entities
      "react/no-unescaped-entities": "off",
      // Allow empty object types (common in Next.js)
      "@typescript-eslint/no-empty-object-type": "off",
      // Allow Function type
      "@typescript-eslint/no-unsafe-function-type": "off",
      // Allow wrapper object types
      "@typescript-eslint/no-wrapper-object-types": "off",
      // Allow require() in script files
      "@typescript-eslint/no-require-imports": "off",
    }
  }
];

export default eslintConfig;
