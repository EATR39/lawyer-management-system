# -*- coding: utf-8 -*-
"""
Avukat Yönetim Sistemi - Şablon Routes
Belge şablonu CRUD endpoint'leri.
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Template
from app.utils.decorators import role_required
import json

templates_bp = Blueprint('templates', __name__)


@templates_bp.route('', methods=['GET'])
@jwt_required()
def get_templates():
    """
    Şablon listesi
    """
    current_user_id = get_jwt_identity()
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', current_app.config['ITEMS_PER_PAGE'], type=int)
    template_type = request.args.get('template_type', '')
    category = request.args.get('category', '')
    search = request.args.get('search', '')
    
    query = Template.query.filter(
        db.or_(
            Template.is_public == True,
            Template.created_by == current_user_id
        )
    )
    
    if template_type:
        query = query.filter(Template.template_type == template_type)
    if category:
        query = query.filter(Template.category == category)
    if search:
        search_filter = f'%{search}%'
        query = query.filter(
            db.or_(
                Template.name.ilike(search_filter),
                Template.content.ilike(search_filter)
            )
        )
    
    query = query.order_by(Template.name.asc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        'templates': [t.to_dict(include_relations=True) for t in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page
    }), 200


@templates_bp.route('/<int:id>', methods=['GET'])
@jwt_required()
def get_template(id):
    """
    Tek şablon detayı
    """
    template = Template.query.get_or_404(id)
    return jsonify({
        'template': template.to_dict(include_relations=True)
    }), 200


@templates_bp.route('', methods=['POST'])
@jwt_required()
def create_template():
    """
    Yeni şablon oluştur
    """
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    if not data:
        return jsonify({'message': 'Geçersiz istek verisi'}), 400
    
    if not data.get('name'):
        return jsonify({'message': 'Şablon adı gereklidir'}), 400
    if not data.get('template_type'):
        return jsonify({'message': 'Şablon tipi gereklidir'}), 400
    if not data.get('content'):
        return jsonify({'message': 'Şablon içeriği gereklidir'}), 400
    
    template = Template(
        name=data['name'].strip(),
        template_type=data['template_type'],
        content=data['content'],
        category=data.get('category'),
        is_public=data.get('is_public', True),
        created_by=current_user_id
    )
    
    # Değişkenleri JSON olarak sakla
    if data.get('variables') and isinstance(data['variables'], list):
        template.variables = json.dumps(data['variables'])
    
    db.session.add(template)
    db.session.commit()
    
    return jsonify({
        'message': 'Şablon başarıyla oluşturuldu',
        'template': template.to_dict()
    }), 201


@templates_bp.route('/<int:id>', methods=['PUT'])
@jwt_required()
def update_template(id):
    """
    Şablon güncelle
    """
    current_user_id = get_jwt_identity()
    template = Template.query.get_or_404(id)
    
    # Yetki kontrolü: sadece oluşturan veya admin güncelleyebilir
    from app.models import User
    user = User.query.get(current_user_id)
    if template.created_by != current_user_id and not user.is_admin():
        return jsonify({'message': 'Bu şablonu güncelleme yetkiniz yok'}), 403
    
    data = request.get_json()
    
    if not data:
        return jsonify({'message': 'Geçersiz istek verisi'}), 400
    
    if 'name' in data:
        template.name = data['name'].strip()
    if 'template_type' in data:
        template.template_type = data['template_type']
    if 'content' in data:
        template.content = data['content']
    if 'category' in data:
        template.category = data['category']
    if 'is_public' in data:
        template.is_public = data['is_public']
    
    if 'variables' in data and isinstance(data['variables'], list):
        template.variables = json.dumps(data['variables'])
    
    db.session.commit()
    
    return jsonify({
        'message': 'Şablon başarıyla güncellendi',
        'template': template.to_dict()
    }), 200


@templates_bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
@role_required(['admin', 'lawyer'])
def delete_template(id):
    """
    Şablon sil
    """
    current_user_id = get_jwt_identity()
    template = Template.query.get_or_404(id)
    
    # Yetki kontrolü
    from app.models import User
    user = User.query.get(current_user_id)
    if template.created_by != current_user_id and not user.is_admin():
        return jsonify({'message': 'Bu şablonu silme yetkiniz yok'}), 403
    
    db.session.delete(template)
    db.session.commit()
    
    return jsonify({'message': 'Şablon başarıyla silindi'}), 200


@templates_bp.route('/<int:id>/render', methods=['POST'])
@jwt_required()
def render_template(id):
    """
    Şablonu değişkenlerle render et
    """
    template = Template.query.get_or_404(id)
    data = request.get_json() or {}
    
    rendered_content = template.render(data.get('context', {}))
    
    return jsonify({
        'rendered_content': rendered_content
    }), 200


@templates_bp.route('/types', methods=['GET'])
@jwt_required()
def get_template_types():
    """
    Şablon tiplerini listele
    """
    return jsonify({
        'types': Template.TEMPLATE_TYPES
    }), 200


@templates_bp.route('/categories', methods=['GET'])
@jwt_required()
def get_categories():
    """
    Kategorileri listele
    """
    return jsonify({
        'categories': Template.CATEGORIES
    }), 200
