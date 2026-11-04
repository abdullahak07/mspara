import type {NextConfig} from 'next';
const config:NextConfig={outputFileTracingIncludes:{'/api/template':['./private/invoice-template.enc']}};
export default config;
