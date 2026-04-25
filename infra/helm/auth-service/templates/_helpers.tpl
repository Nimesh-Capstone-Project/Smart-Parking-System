{{- define "auth-service.namespace" -}}
{{- default .Release.Namespace .Values.namespace -}}
{{- end -}}

{{- define "auth-service.image" -}}
{{- if .tag -}}
{{ printf "%s:%s" .repository .tag }}
{{- else -}}
{{ .repository }}
{{- end -}}
{{- end -}}
