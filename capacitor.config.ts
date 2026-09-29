import type {CapacitorConfig} from '@capacitor/cli';
const target=process.env.DD_WORLD_APP_TARGET||'legacy';
const configs={agent:{appId:'com.ddworld.agent.app',appName:'DD WORLD Agent App'},management:{appId:'com.ddworld.management.app',appName:'DD WORLD Management App'},audit:{appId:'com.ddworld.audit.app',appName:'DD WORLD Audit Portal'},legacy:{appId:'com.ddworld.marketing.app',appName:'DD WORLD MARKETING'}} as Record<string,{appId:string;appName:string}>;
const selected=configs[target]||configs.legacy;
const config:CapacitorConfig={appId:selected.appId,appName:selected.appName,webDir:'dist',server:{androidScheme:'https',cleartext:true}};
export default config;