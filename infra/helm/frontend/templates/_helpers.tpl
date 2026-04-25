{{- define "frontend.namespace" -}}
{{- default .Release.Namespace .Values.namespace -}}
{{- end -}}

{{- define "frontend.image" -}}
{{- if .tag -}}
{{ printf "%s:%s" .repository .tag }}
{{- else -}}
{{ .repository }}
{{- end -}}
{{- end -}}
