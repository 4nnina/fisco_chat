export interface ChatConfig {
	model: string;
	temperature: number;
	max_history: number;
	system_prompt_template: string;
	tone_of_voice: string;
}

export interface ChatConfigResponse extends ChatConfig {
	error?: string;
}

export interface ChatToneSourceResponse {
	tone_of_voice: string;
	error?: string;
}
