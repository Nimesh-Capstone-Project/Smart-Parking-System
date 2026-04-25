{{- define "gateway.namespace" -}}
{{- default .Release.Namespace .Values.namespace -}}
{{- end -}}
