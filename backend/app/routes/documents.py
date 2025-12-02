# -*- coding: utf-8 -*-
"""
Avukat Yönetim Sistemi - Belge Routes
Belge yükleme/indirme endpoint'leri.
"""

import os
import uuid
from flask import Blueprint, request, jsonify, current_app, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from app import db
from app.models import Document
from app.utils.decorators import role_required

documents_bp = Blueprint('documents', __name__)


def allowed_file(filename):
    """Dosya uzantısı kontrolü"""
    if '.' not in filename:
        return False
    ext = filename.rsplit('.', 1)[1].lower()
    return ext in current_app.config['ALLOWED_EXTENSIONS']


def get_file_extension(filename):
    """Dosya uzantısını döndürür"""
    if '.' in filename:
        return filename.rsplit('.', 1)[1].lower()
    return ''


@documents_bp.route('', methods=['GET'])
@jwt_required()
def get_documents():
    """
    Belge listesi
    """
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', current_app.config['ITEMS_PER_PAGE'], type=int)
    document_type = request.args.get('document_type', '')
    related_to = request.args.get('related_to', '')
    related_id = request.args.get('related_id', type=int)
    search = request.args.get('search', '')
    
    query = Document.query
    
    if document_type:
        query = query.filter(Document.document_type == document_type)
    if related_to:
        query = query.filter(Document.related_to == related_to)
    if related_id:
        query = query.filter(Document.related_id == related_id)
    if search:
        search_filter = f'%{search}%'
        query = query.filter(
            db.or_(
                Document.original_filename.ilike(search_filter),
                Document.description.ilike(search_filter)
            )
        )
    
    query = query.order_by(Document.created_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        'documents': [d.to_dict(include_relations=True) for d in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page
    }), 200


@documents_bp.route('/<int:id>', methods=['GET'])
@jwt_required()
def get_document(id):
    """
    Tek belge detayı
    """
    document = Document.query.get_or_404(id)
    return jsonify({
        'document': document.to_dict(include_relations=True)
    }), 200


@documents_bp.route('/upload', methods=['POST'])
@jwt_required()
def upload_document():
    """
    Belge yükle
    """
    current_user_id = get_jwt_identity()
    
    if 'file' not in request.files:
        return jsonify({'message': 'Dosya bulunamadı'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'message': 'Dosya seçilmedi'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'message': 'Bu dosya tipi desteklenmiyor'}), 400
    
    # Güvenli dosya adı oluştur
    original_filename = secure_filename(file.filename)
    ext = get_file_extension(original_filename)
    unique_filename = f'{uuid.uuid4().hex}.{ext}'
    
    # Dosyayı kaydet
    file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], unique_filename)
    file.save(file_path)
    
    # Dosya boyutunu al
    file_size = os.path.getsize(file_path)
    
    # Belge kaydı oluştur
    document = Document(
        filename=unique_filename,
        original_filename=original_filename,
        file_path=file_path,
        file_size=file_size,
        mime_type=file.content_type,
        document_type=request.form.get('document_type', 'other'),
        related_to=request.form.get('related_to'),
        related_id=request.form.get('related_id', type=int),
        description=request.form.get('description', '').strip() or None,
        uploaded_by=current_user_id
    )
    
    db.session.add(document)
    db.session.commit()
    
    return jsonify({
        'message': 'Belge başarıyla yüklendi',
        'document': document.to_dict()
    }), 201


@documents_bp.route('/<int:id>/download', methods=['GET'])
@jwt_required()
def download_document(id):
    """
    Belge indir
    """
    document = Document.query.get_or_404(id)
    
    # Güvenlik: Dosya yolunun uploads klasörü içinde olduğunu doğrula
    upload_folder = os.path.abspath(current_app.config['UPLOAD_FOLDER'])
    file_path = os.path.abspath(document.file_path)
    
    # Directory traversal koruması
    if not file_path.startswith(upload_folder):
        return jsonify({'message': 'Geçersiz dosya yolu'}), 403
    
    if not os.path.exists(file_path):
        return jsonify({'message': 'Dosya bulunamadı'}), 404
    
    return send_file(
        file_path,
        as_attachment=True,
        download_name=document.original_filename
    )


@documents_bp.route('/<int:id>', methods=['PUT'])
@jwt_required()
def update_document(id):
    """
    Belge bilgilerini güncelle
    """
    document = Document.query.get_or_404(id)
    data = request.get_json()
    
    if not data:
        return jsonify({'message': 'Geçersiz istek verisi'}), 400
    
    if 'document_type' in data:
        document.document_type = data['document_type']
    if 'description' in data:
        document.description = data['description'].strip() or None
    if 'related_to' in data:
        document.related_to = data['related_to']
    if 'related_id' in data:
        document.related_id = data['related_id']
    
    db.session.commit()
    
    return jsonify({
        'message': 'Belge başarıyla güncellendi',
        'document': document.to_dict()
    }), 200


@documents_bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
@role_required(['admin', 'lawyer'])
def delete_document(id):
    """
    Belge sil
    """
    document = Document.query.get_or_404(id)
    
    # Fiziksel dosyayı sil
    if os.path.exists(document.file_path):
        os.remove(document.file_path)
    
    db.session.delete(document)
    db.session.commit()
    
    return jsonify({'message': 'Belge başarıyla silindi'}), 200


@documents_bp.route('/types', methods=['GET'])
@jwt_required()
def get_document_types():
    """
    Belge tiplerini listele
    """
    return jsonify({
        'types': Document.DOCUMENT_TYPES
    }), 200
