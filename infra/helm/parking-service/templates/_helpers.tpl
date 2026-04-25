{{- define "parking-service.namespace" -}}
{{- default .Release.Namespace .Values.namespace -}}
{{- end -}}

{{- define "parking-service.image" -}}
{{- if .tag -}}
{{ printf "%s:%s" .repository .tag }}
{{- else -}}
{{ .repository }}
{{- end -}}
{{- end -}}
