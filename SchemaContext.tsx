import React, { createContext, Dispatch, SetStateAction } from 'react';
import Schema from '@/components/schema';

// Define an interface for the context value
interface SchemaContextProps {
  schema: Schema | null;
  setSchema: Dispatch<SetStateAction<Schema | null>>;
}

// Create the context with a default value
const SchemaContext = createContext<SchemaContextProps>({
  schema: null,
  setSchema: () => {},  // Default function that does nothing
});

export default SchemaContext;